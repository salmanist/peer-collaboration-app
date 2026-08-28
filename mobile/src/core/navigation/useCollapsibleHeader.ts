import { useRef } from "react";
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

export function useCollapsibleHeader(headerHeight: number = 80) {
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const isHeaderVisible = useRef(true);
  const prevScrollY = useRef(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const diff = currentScrollY - prevScrollY.current;

    // At top of scroll view
    if (currentScrollY <= 15) {
      if (!isHeaderVisible.current) {
        Animated.spring(headerTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
          speed: 18,
        }).start();
        isHeaderVisible.current = true;
      }
    } else if (diff > 7 && currentScrollY > 50) {
      // Scrolling down through content -> Slide header up and hide
      if (isHeaderVisible.current) {
        Animated.timing(headerTranslateY, {
          toValue: -(headerHeight + 60),
          duration: 180,
          useNativeDriver: true,
        }).start();
        isHeaderVisible.current = false;
      }
    } else if (diff < -7) {
      // Scrolling up (pulling down to see previous items) -> Instant smooth appearance
      if (!isHeaderVisible.current) {
        Animated.spring(headerTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
          speed: 18,
        }).start();
        isHeaderVisible.current = true;
      }
    }

    prevScrollY.current = currentScrollY;
  };

  return {
    headerTranslateY,
    handleScroll,
  };
}
