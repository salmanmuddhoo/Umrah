import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { makeUser, resetDb } from "../../test/factories";
import * as community from "./community";

const post = { title: "A question about tawaf", body: "What should I do if I lose count?", topic: "rituals" };
const q = (s = "") => new URLSearchParams(s);

describe("community", () => {
  beforeEach(resetDb);

  it("creates a post that starts with the author's own upvote", async () => {
    const author = await makeUser();
    const created = await community.createPost(author, post);
    const [listed] = await community.listPosts(author, q());
    expect(listed).toMatchObject({ id: created.id, score: 1, myVote: 1, commentCount: 0, authorName: author.name });
  });

  it("rejects short posts and unknown topics", async () => {
    const author = await makeUser();
    await expect(community.createPost(author, { ...post, title: "Hi" })).rejects.toMatchObject({ status: 400 });
    await expect(community.createPost(author, { ...post, body: "short" })).rejects.toMatchObject({ status: 400 });
    await expect(community.createPost(author, { ...post, topic: "politics" })).rejects.toMatchObject({ status: 400 });
  });

  it("counts one vote per person, lets them switch, and removes it when repeated", async () => {
    const created = await community.createPost(await makeUser(), post);
    const reader = await makeUser();
    expect(await community.vote(reader, created.id, 1)).toEqual({ score: 2, myVote: 1 });
    expect(await community.vote(reader, created.id, -1)).toEqual({ score: 0, myVote: -1 });
    expect(await community.vote(reader, created.id, -1)).toEqual({ score: 1, myVote: 0 });
  });

  it("rejects votes that are not +1 or -1", async () => {
    const created = await community.createPost(await makeUser(), post);
    await expect(community.vote(await makeUser(), created.id, 5)).rejects.toMatchObject({ status: 400 });
    await expect(community.vote(await makeUser(), "missing", 1)).rejects.toMatchObject({ status: 404 });
  });

  it("sorts by score by default and by date when asked, and filters by topic", async () => {
    const author = await makeUser();
    const older = await community.createPost(author, { ...post, title: "Older post" });
    const newer = await community.createPost(author, { ...post, title: "Newer post", topic: "travel" });
    await db.post.update({ where: { id: older.id }, data: { createdAt: new Date(Date.now() - 60_000) } });
    await community.vote(await makeUser(), older.id, 1);

    expect((await community.listPosts(null, q())).map((p) => p.id)).toEqual([older.id, newer.id]);
    expect((await community.listPosts(null, q("sort=new"))).map((p) => p.id)).toEqual([newer.id, older.id]);
    expect((await community.listPosts(null, q("topic=travel"))).map((p) => p.id)).toEqual([newer.id]);
  });

  it("threads replies under their parent comment", async () => {
    const author = await makeUser();
    const created = await community.createPost(author, post);
    const top = await community.addComment(await makeUser(), created.id, { body: "Assume the lower number." });
    await community.addComment(author, created.id, { body: "Thank you!", parentId: top.id });

    const full = await community.getPost(null, created.id);
    expect(full.commentCount).toBe(2);
    expect(full.comments.map((c) => c.parentId)).toEqual([null, top.id]);
  });

  it("refuses a reply whose parent belongs to another post", async () => {
    const author = await makeUser();
    const a = await community.createPost(author, post);
    const b = await community.createPost(author, post);
    const onA = await community.addComment(author, a.id, { body: "On post A" });
    await expect(community.addComment(author, b.id, { body: "Wrong thread", parentId: onA.id })).rejects.toMatchObject({ status: 400 });
  });

  it("lets only the author or an admin delete a post", async () => {
    const author = await makeUser();
    const created = await community.createPost(author, post);
    await expect(community.deletePost(await makeUser(), created.id)).rejects.toMatchObject({ status: 403 });
    await expect(community.deletePost(await makeUser("ADMIN"), created.id)).resolves.toEqual({ deleted: true });
  });

  it("removes replies along with a deleted comment", async () => {
    const author = await makeUser();
    const created = await community.createPost(author, post);
    const top = await community.addComment(author, created.id, { body: "Parent" });
    await community.addComment(author, created.id, { body: "Child", parentId: top.id });
    await expect(community.deleteComment(await makeUser(), top.id)).rejects.toMatchObject({ status: 403 });
    await community.deleteComment(author, top.id);
    expect(await db.comment.count()).toBe(0);
  });
});
