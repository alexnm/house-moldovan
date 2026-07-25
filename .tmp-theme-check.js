(function () {
  var styles = Array.from(document.querySelectorAll("style"));
  var found = [];
  for (var i = 0; i < styles.length; i++) {
    var t = styles[i].textContent || "";
    if (t.includes("0.972") || t.includes("data-theme")) {
      found.push({
        i: i,
        len: t.length,
        hasLightAccent: t.includes("0.58 0.14 95"),
        hasDarkAccent: t.includes("0.92 0.14 98"),
        hasLightSurface: t.includes("0.972 0.008 72"),
        lightAccentIdx: t.indexOf("0.58 0.14 95"),
        darkAccentIdx: t.indexOf("0.92 0.14 98"),
      });
    }
  }
  // Also walk CSSOM for matching rules on html
  var html = document.documentElement;
  var matched = [];
  for (var s of document.styleSheets) {
    try {
      for (var rule of s.cssRules) {
        if (!rule.selectorText) continue;
        if (
          rule.selectorText.includes("data-theme") &&
          html.matches(rule.selectorText.split(",")[0].trim())
        ) {
          matched.push({
            sel: rule.selectorText,
            accent: rule.style.getPropertyValue("--color-accent"),
            surface: rule.style.getPropertyValue("--color-surface"),
            jade: rule.style.getPropertyValue("--color-jade"),
          });
        }
      }
    } catch (e) {}
  }
  return JSON.stringify({ found: found, matched: matched }, null, 2);
})();
