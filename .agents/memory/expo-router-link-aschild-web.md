---
name: expo-router Link asChild loses Pressable background on web
description: Why a redesigned not-found/link button renders unstyled on the Expo web build
---

On the Expo **web** build, wrapping a function-style `Pressable` in `<Link href="..." asChild>` can drop the child's applied styles — a pill `Pressable` with `backgroundColor` + `style={({pressed}) => [...]}` rendered with NO background (faint text only), even though the same Pressable renders correctly when used standalone.

**Why:** `Link asChild` clones the child and on web renders through an `<a>`; the function-form `style` / background didn't survive the clone in this setup. Reproduced across multiple screenshots; not an HMR artifact.

**How to apply:** For a styled button that navigates, use a plain `Pressable` with `onPress={() => router.navigate('/path')}` instead of `Link asChild`. `router.navigate()` matches `<Link href>`'s default (navigate, not push/replace), so navigation semantics are unchanged.
