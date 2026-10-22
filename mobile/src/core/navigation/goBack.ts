import { router, type Href } from "expo-router";

/** Back buttons must also work after a refresh or a direct link. */
export function goBack(fallbackHref: string = "/(app)/home") {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackHref as Href);
  }
}
