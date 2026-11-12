import { Image, type ImageStyle, type StyleProp } from 'react-native';

/** The One Ummah mark: a hand with the index finger raised, as in the shahada. */
export function Logo({ size = 48, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={require('../../assets/images/logo.png')}
      accessibilityLabel="One Ummah logo"
      accessibilityRole="image"
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}
