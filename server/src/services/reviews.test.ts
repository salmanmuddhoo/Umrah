import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { listPackages, getService } from "./catalog";
import { makePackage, makeProvider, makeService, makeUser, resetDb } from "../../test/factories";
import * as reviews from "./reviews";

const great = { rating: 5, comment: "Wonderful trip, very well organised." };

describe("readReview", () => {
  it("accepts a rating with or without a comment", () => {
    expect(reviews.readReview({ rating: 4 })).toEqual({ data: { rating: 4, comment: "" } });
    expect(reviews.readReview({ rating: "5", comment: "  Excellent  " })).toEqual({ data: { rating: 5, comment: "Excellent" } });
  });

  it.each([[{ rating: 0 }], [{ rating: 6 }], [{ rating: 3.5 }], [{ rating: "five" }], [{}]])("rejects rating %j", (input) => {
    expect(reviews.readReview(input)).toEqual({ error: "Choose a rating from 1 to 5 stars." });
  });

  it("rejects a comment that is too short to mean anything", () => {
    expect(reviews.readReview({ rating: 4, comment: "ok" })).toHaveProperty("error");
  });
});

describe("reviews", () => {
  beforeEach(resetDb);

  it("lets a pilgrim review a package and shows it with a summary", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"));
    const aisha = await makeUser();
    await db.user.update({ where: { id: aisha.id }, data: { name: "Aisha Rahman" } });
    await reviews.saveReview(aisha, "package", pkg.id, great);
    await reviews.saveReview(await makeUser(), "package", pkg.id, { rating: 2 });

    const list = await reviews.listReviews("package", pkg.id, aisha);
    expect(list).toMatchObject({ ratingAverage: 3.5, ratingCount: 2 });
    const mine = list.reviews.find((r) => r.mine)!;
    expect(mine).toMatchObject({ rating: 5, comment: great.comment, authorName: "Aisha", verified: false });
  });

  it("keeps one review per person per listing, updating it when they review again", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"));
    const pilgrim = await makeUser();
    await reviews.saveReview(pilgrim, "package", pkg.id, great);
    await reviews.saveReview(pilgrim, "package", pkg.id, { rating: 3, comment: "Changed my mind a little." });
    const list = await reviews.listReviews("package", pkg.id, pilgrim);
    expect(list.ratingCount).toBe(1);
    expect(list.reviews[0]).toMatchObject({ rating: 3, comment: "Changed my mind a little." });
  });

  it("works for transport services too, separately from packages", async () => {
    const service = await makeService(await makeProvider("TRANSPORT"));
    const pilgrim = await makeUser();
    await reviews.saveReview(pilgrim, "transport", service.id, { rating: 4 });
    expect(await reviews.listReviews("transport", service.id, null)).toMatchObject({ ratingAverage: 4, ratingCount: 1 });
    expect((await reviews.listReviews("transport", service.id, null)).reviews[0].mine).toBe(false);
  });

  it("marks reviews from people whose booking the provider accepted as verified", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"));
    const traveller = await makeUser();
    const pending = await makeUser();
    const booking = (userId: string, status: string) =>
      db.packageBooking.create({ data: { packageId: pkg.id, userId, travellers: 1, contactPhone: "+1 555 0100", totalCents: 1, commissionCents: 0, status } });
    await booking(traveller.id, "COMPLETED");
    await booking(pending.id, "PENDING");

    expect((await reviews.saveReview(traveller, "package", pkg.id, great)).verified).toBe(true);
    await reviews.saveReview(pending, "package", pkg.id, great);
    const list = await reviews.listReviews("package", pkg.id, null);
    expect(list.reviews.map((r) => r.verified).sort()).toEqual([false, true]);
  });

  it("does not let a provider review their own listing", async () => {
    const owner = await makeProvider("UMRAH");
    const pkg = await makePackage(owner);
    await expect(reviews.saveReview(owner, "package", pkg.id, great)).rejects.toMatchObject({ status: 403 });
  });

  it("refuses reviews of hidden listings, unknown listings and unknown kinds", async () => {
    const hidden = await makePackage(await makeProvider("UMRAH"), { active: false });
    const user = await makeUser();
    await expect(reviews.saveReview(user, "package", hidden.id, great)).rejects.toMatchObject({ status: 404 });
    await expect(reviews.saveReview(user, "package", "missing", great)).rejects.toMatchObject({ status: 404 });
    await expect(reviews.saveReview(user, "hotel", hidden.id, great)).rejects.toMatchObject({ status: 404 });
    await expect(reviews.listReviews("hotel", hidden.id, null)).rejects.toMatchObject({ status: 404 });
  });

  it("rejects an invalid rating without saving anything", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"));
    await expect(reviews.saveReview(await makeUser(), "package", pkg.id, { rating: 9 })).rejects.toMatchObject({ status: 400 });
    expect(await db.review.count()).toBe(0);
  });

  it("lets the author or an admin delete a review, and nobody else", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"));
    const author = await makeUser();
    const first = await reviews.saveReview(author, "package", pkg.id, great);
    await expect(reviews.deleteReview(await makeUser(), first.id)).rejects.toMatchObject({ status: 403 });
    await expect(reviews.deleteReview(author, first.id)).resolves.toEqual({ deleted: true });

    const second = await reviews.saveReview(author, "package", pkg.id, great);
    await expect(reviews.deleteReview(await makeUser("ADMIN"), second.id)).resolves.toEqual({ deleted: true });
    await expect(reviews.deleteReview(author, second.id)).rejects.toMatchObject({ status: 404 });
  });

  it("never exposes reviewers' contact details or surnames", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"));
    const user = await makeUser();
    await db.user.update({ where: { id: user.id }, data: { name: "Yusuf Ali" } });
    await reviews.saveReview(user, "package", pkg.id, great);
    const [shown] = (await reviews.listReviews("package", pkg.id, null)).reviews;
    expect(shown.authorName).toBe("Yusuf");
    expect(JSON.stringify(shown)).not.toContain(user.email!);
    expect(shown).not.toHaveProperty("userId");
  });
});

describe("ratings on listings", () => {
  beforeEach(resetDb);

  it("adds the average and count to package and service listings", async () => {
    const pkg = await makePackage(await makeProvider("UMRAH"));
    await makePackage(await makeProvider("UMRAH"), { title: "Unreviewed" });
    const service = await makeService(await makeProvider("TRANSPORT"));
    await reviews.saveReview(await makeUser(), "package", pkg.id, { rating: 5 });
    await reviews.saveReview(await makeUser(), "package", pkg.id, { rating: 4 });
    await reviews.saveReview(await makeUser(), "package", pkg.id, { rating: 4 });
    await reviews.saveReview(await makeUser(), "transport", service.id, { rating: 3 });

    const list = await listPackages(new URLSearchParams());
    expect(list.find((p) => p.id === pkg.id)).toMatchObject({ ratingAverage: 4.3, ratingCount: 3 });
    expect(list.find((p) => p.title === "Unreviewed")).toMatchObject({ ratingAverage: null, ratingCount: 0 });
    expect(await getService(service.id, null)).toMatchObject({ ratingAverage: 3, ratingCount: 1 });
  });
});
