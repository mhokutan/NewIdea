// Gradient scrims behind text on top of video and images. expo-linear-gradient renders the same on iOS,
// Android and web (the CSS gradient style prop does not render on web).
import { LinearGradient } from 'expo-linear-gradient';
import type { StyleProp, ViewStyle } from 'react-native';

type Props = { colors: readonly [string, string, ...string[]]; locations?: readonly [number, number, ...number[]]; style?: StyleProp<ViewStyle>; horizontal?: boolean };

export function Fade({ colors, locations, style, horizontal }: Props) {
  return <LinearGradient colors={colors} locations={locations} style={style} pointerEvents="none"
    start={horizontal ? { x: 0, y: 0 } : { x: 0.5, y: 0 }} end={horizontal ? { x: 1, y: 1 } : { x: 0.5, y: 1 }} />;
}
