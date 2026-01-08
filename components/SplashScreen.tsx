import { Image } from "react-native";
import { View, Text, Animated } from "react-native";
import { useEffect, useRef } from "react";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Loading dots animation - continuous loop
    const createDotAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const dot1Loop = createDotAnimation(dot1Anim, 0);
    const dot2Loop = createDotAnimation(dot2Anim, 200);
    const dot3Loop = createDotAnimation(dot3Anim, 400);

    dot1Loop.start();
    dot2Loop.start();
    dot3Loop.start();

    // Auto transition after 2-3 seconds
    const timer = setTimeout(() => {
      dot1Loop.stop();
      dot2Loop.stop();
      dot3Loop.stop();
      onFinish();
    }, 2500);

    return () => {
      clearTimeout(timer);
      dot1Loop.stop();
      dot2Loop.stop();
      dot3Loop.stop();
    };
  }, []);

  const dot1Opacity = dot1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const dot2Opacity = dot2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const dot3Opacity = dot3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Logo */}
        <Image
          source={require("@/assets/images/icon.png")}
          style={{ width: 120, height: 120, marginBottom: 32 }}
          resizeMode="contain"
        />

        {/* Tagline */}
        <View className="items-center mb-16">
          <Text
            className="text-2xl font-medium"
            style={{ color: "#E5E5E5" }}
          >
            Pet Life.{" "}
            <Text style={{ color: "#5FC4C0" }}>Simplified.</Text>
          </Text>
        </View>

        {/* Loading Dots */}
        <View className="flex-row items-center gap-2">
          <Animated.View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#5FC4C0",
              opacity: dot1Opacity,
            }}
          />
          <Animated.View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#5FC4C0",
              opacity: dot2Opacity,
            }}
          />
          <Animated.View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#5FC4C0",
              opacity: dot3Opacity,
            }}
          />
        </View>
      </Animated.View>
    </View>
  );
}

