import { useLayoutEffect, useRef, useState } from 'react';

import {
  DEFAULT_THEME_FORM_RADIUS,
  DEFAULT_THEME_RADIUS,
  THEME_FORM_RADIUS,
  THEME_RADIUS,
  type ThemeFormRadius,
  type ThemeRadius,
} from './constants';

const THEME_RADIUS_STORAGE_KEY = 'heroui-theme-radius';
const THEME_FORM_RADIUS_STORAGE_KEY = 'heroui-theme-form-radius';

const THEME_RADIUS_VALUES = new Set<string>(Object.values(THEME_RADIUS));
const THEME_FORM_RADIUS_VALUES = new Set<string>(Object.values(THEME_FORM_RADIUS));

type ThemeShape = {
  radius: ThemeRadius;
  formRadius: ThemeFormRadius;
};

function isThemeRadius(value: string): value is ThemeRadius {
  return THEME_RADIUS_VALUES.has(value);
}

function isThemeFormRadius(value: string): value is ThemeFormRadius {
  return THEME_FORM_RADIUS_VALUES.has(value);
}

function readStoredThemeShape(defaultShape: ThemeShape): ThemeShape {
  if (typeof window === 'undefined') return defaultShape;

  const storedRadius = localStorage.getItem(THEME_RADIUS_STORAGE_KEY);
  const storedFormRadius = localStorage.getItem(THEME_FORM_RADIUS_STORAGE_KEY);

  return {
    radius: storedRadius && isThemeRadius(storedRadius) ? storedRadius : defaultShape.radius,
    formRadius:
      storedFormRadius && isThemeFormRadius(storedFormRadius)
        ? storedFormRadius
        : defaultShape.formRadius,
  };
}

function applyThemeShapeToDOM(shape: ThemeShape, previous: ThemeShape | undefined) {
  if (previous?.radius !== shape.radius) {
    document.documentElement.setAttribute('data-theme-radius', shape.radius);
  }
  if (previous?.formRadius !== shape.formRadius) {
    document.documentElement.setAttribute('data-theme-form-radius', shape.formRadius);
  }
}

/** localStorage 持久化，同时同步 HeroUI 圆角 token 到 documentElement */
export function useThemeShape(
  defaultShape: ThemeShape = {
    radius: DEFAULT_THEME_RADIUS,
    formRadius: DEFAULT_THEME_FORM_RADIUS,
  }
) {
  const [themeShape, setThemeShape] = useState<ThemeShape>(() =>
    readStoredThemeShape(defaultShape)
  );
  const appliedRef = useRef<ThemeShape | undefined>(undefined);

  useLayoutEffect(() => {
    applyThemeShapeToDOM(themeShape, appliedRef.current);
    appliedRef.current = themeShape;
  }, [themeShape]);

  const setRadius = (radius: ThemeRadius) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(THEME_RADIUS_STORAGE_KEY, radius);
    setThemeShape((prev) => ({ ...prev, radius }));
  };

  const setFormRadius = (formRadius: ThemeFormRadius) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(THEME_FORM_RADIUS_STORAGE_KEY, formRadius);
    setThemeShape((prev) => ({ ...prev, formRadius }));
  };

  return { ...themeShape, setRadius, setFormRadius };
}
