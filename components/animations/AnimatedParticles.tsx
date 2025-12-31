import React, { useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

// Configuration
const PARTICLE_COUNT = 10;
const PARTICLE_COLOR = "#4FD1C5";
const MIN_SIZE = 2;
const MAX_SIZE = 4;
const MIN_OPACITY = 0.3;
const MAX_OPACITY = 0.7;
const MIN_SPEED = 0.01; // points per second (super slow)
const MAX_SPEED = 0.03; // points per second (super slow)
const ANIMATION_DURATION = 120000; // 120 seconds for one cycle (slower)

interface ParticleConfig {
  id: number;
  initialX: number;
  initialY: number;
  size: number;
  opacity: number;
  velocityX: number;
  velocityY: number;
}

interface ParticleProps {
  config: ParticleConfig;
  screenWidth: number;
  screenHeight: number;
}

// Individual particle component with its own animation
const Particle: React.FC<ParticleProps> = React.memo(
  ({ config, screenWidth, screenHeight }) => {
    const { initialX, initialY, size, opacity, velocityX, velocityY } = config;

    // Calculate total distance traveled in one animation cycle
    const distanceX = velocityX * ANIMATION_DURATION;
    const distanceY = velocityY * ANIMATION_DURATION;

    // Shared values for position offsets
    const offsetX = useSharedValue(0);
    const offsetY = useSharedValue(0);

    useEffect(() => {
      // Start continuous animations
      offsetX.value = withRepeat(
        withTiming(distanceX, {
          duration: ANIMATION_DURATION,
          easing: Easing.linear,
        }),
        -1, // Infinite repeats
        false // Don't reverse
      );

      offsetY.value = withRepeat(
        withTiming(distanceY, {
          duration: ANIMATION_DURATION,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }, [distanceX, distanceY, offsetX, offsetY]);

    const animatedStyle = useAnimatedStyle(() => {
      // Calculate current position with wrapping
      let x = (initialX + offsetX.value) % screenWidth;
      let y = (initialY + offsetY.value) % screenHeight;

      // Handle negative values for proper wrapping
      if (x < 0) x += screenWidth;
      if (y < 0) y += screenHeight;

      return {
        transform: [{ translateX: x }, { translateY: y }],
      };
    });

    return (
      <Animated.View
        style={[
          styles.particle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity,
            backgroundColor: PARTICLE_COLOR,
            shadowColor: PARTICLE_COLOR,
            shadowOpacity: 0.8,
            shadowRadius: size * 2,
            shadowOffset: { width: 0, height: 0 },
          },
          animatedStyle,
        ]}
      />
    );
  }
);

Particle.displayName = "Particle";

// Main component
export const AnimatedParticles: React.FC = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Generate particle configurations once
  const particles = useMemo<ParticleConfig[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
      // Random position across the screen
      const initialX = Math.random() * screenWidth;
      const initialY = Math.random() * screenHeight;

      // Random size between MIN_SIZE and MAX_SIZE
      const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);

      // Random opacity between MIN_OPACITY and MAX_OPACITY
      const opacity = MIN_OPACITY + Math.random() * (MAX_OPACITY - MIN_OPACITY);

      // Random velocity (can be positive or negative for different directions)
      const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
      const angle = Math.random() * Math.PI * 2; // Random direction
      const velocityX = Math.cos(angle) * speed;
      const velocityY = Math.sin(angle) * speed;

      return {
        id: index,
        initialX,
        initialY,
        size,
        opacity,
        velocityX,
        velocityY,
      };
    });
  }, [screenWidth, screenHeight]);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle) => (
        <Particle
          key={particle.id}
          config={particle}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  particle: {
    position: "absolute",
  },
});

export default AnimatedParticles;

