import { useEffect } from "react";

/** Ensures dark mode class is applied. */
const ThemeRuntime = () => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return null;
};

export default ThemeRuntime;
