/* @ds-bundle: {"format":4,"namespace":"NotaA","components":[{"name":"Button"},{"name":"TextField"},{"name":"Select"},{"name":"Chip"},{"name":"Tabs"},{"name":"SideNav"},{"name":"GradeGrid"},{"name":"ProgressTrail"},{"name":"Notice"},{"name":"EmptyState"},{"name":"Aurora"}]} */
(function () {
  var R = window.React, h = R.createElement, useState = R.useState, useId = R.useId;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }
  function rest(p, omit) { var o = {}; for (var k in p) if (omit.indexOf(k) < 0) o[k] = p[k]; return o; }

  var PATHS = {
    info: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 16v-5", "M12 8h.01"],
    success: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M8 12.5l2.7 2.7L16 9.8"],
    warning: ["M10.3 3.9L1.8 18.5A2 2 0 0 0 3.5 21.5h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z", "M12 9v4", "M12 17h.01"],
    danger: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M15 9l-6 6", "M9 9l6 6"]
  };
  function Icon(tone) {
    var p = PATHS[tone]; if (!p) return null;
    return h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
      p.map(function (d, i) { return h("path", { key: i, d: d }); }));
  }

  function Button(props) {
    var variant = props.variant || "primary", size = props.size || "md";
    return h("button", Object.assign({ type: "button" }, rest(props, ["variant", "size", "loading", "className", "children"]), {
      className: cx("na-btn", "na-btn-" + variant, size === "sm" && "na-btn-sm", props.className),
      disabled: props.disabled || props.loading, "aria-busy": props.loading ? "true" : undefined
    }), props.loading ? h("span", { className: "na-spin", "aria-hidden": "true" }) : null, props.children);
  }

  function Field(props, control) {
    var auto = useId(), id = props.id || auto, hintId = id + "-hint", msg = props.error || props.hint;
    return h("div", { className: cx("na-field", props.error && "na-field-error", props.className) },
      h("label", { className: "na-field-label", htmlFor: id }, props.label),
      control(id, msg ? hintId : undefined),
      msg ? h("span", { className: "na-field-hint", id: hintId }, props.error || props.hint) : null);
  }

  function TextField(props) {
    return Field(props, function (id, describedBy) {
      return h("input", Object.assign({ type: "text" }, rest(props, ["label", "hint", "error", "className", "id"]), {
        id: id, "aria-describedby": describedBy, "aria-invalid": props.error ? "true" : undefined
      }));
    });
  }

  function Select(props) {
    return Field(props, function (id, describedBy) {
      return h("select", Object.assign({}, rest(props, ["label", "hint", "error", "className", "id", "options"]), {
        id: id, "aria-describedby": describedBy, "aria-invalid": props.error ? "true" : undefined
      }), (props.options || []).map(function (o) { return h("option", { key: o.value, value: o.value }, o.label); }));
    });
  }

  function Chip(props) {
    var tone = props.tone || "neutral";
    return h("span", { className: cx("na-chip", "na-chip-" + tone, props.className) }, Icon(tone), props.children);
  }

  function Tabs(props) {
    var tabs = props.tabs || [], first = tabs[0] && tabs[0].id;
    var st = useState(props.defaultValue || first), inner = st[0], setInner = st[1];
    var value = props.value !== undefined ? props.value : inner;
    function pick(id) { setInner(id); if (props.onChange) props.onChange(id); }
    function onKey(e) {
      var i = tabs.findIndex(function (t) { return t.id === value; }), n = tabs.length;
      if (e.key === "ArrowRight") pick(tabs[(i + 1) % n].id);
      if (e.key === "ArrowLeft") pick(tabs[(i - 1 + n) % n].id);
    }
    return h("div", { className: "na-tabs", role: "tablist", "aria-label": props.label, onKeyDown: onKey },
      tabs.map(function (t) {
        var on = t.id === value;
        return h("button", { key: t.id, type: "button", role: "tab", className: "na-tab", "aria-selected": on ? "true" : "false", tabIndex: on ? 0 : -1, onClick: function () { pick(t.id); } },
          t.label, t.count != null ? h("span", { className: "na-tab-count" }, t.count) : null);
      }));
  }

  function SideNav(props) {
    var items = props.items || [];
    return h("nav", { className: "na-nav", "aria-label": props.label || "Principal" },
      h("div", { className: "na-nav-brand" }, props.logo ? h("img", { className: "na-nav-mark", src: props.logo, alt: "" }) : null, props.brand || "Nota A"),
      items.map(function (it) {
        if (it.group) return h("div", { key: "g-" + it.group, className: "na-nav-group" }, it.group);
        return h("a", { key: it.id, href: it.href || "#", className: "na-nav-item", "aria-current": it.id === props.current ? "page" : undefined },
          it.label, it.badge ? h("span", { className: "na-nav-badge" }, it.badge) : null);
      }));
  }

  function fmt(n) { return n == null || isNaN(n) ? "–" : n.toFixed(1).replace(".", ","); }
  function parse(v) { if (v === "" || v == null) return null; var n = Number(String(v).replace(",", ".")); return isNaN(n) ? NaN : n; }
  function GradeGrid(props) {
    var cols = props.columns || [], max = props.max == null ? 10 : props.max, min = props.min == null ? 0 : props.min, passing = props.passing == null ? 6 : props.passing;
    var st = useState(function () { var m = {}; (props.rows || []).forEach(function (r) { m[r.id] = Object.assign({}, r.grades); }); return m; });
    var grades = st[0], setGrades = st[1];
    function set(rowId, colId, v) {
      setGrades(function (g) { var n = Object.assign({}, g); n[rowId] = Object.assign({}, n[rowId]); n[rowId][colId] = v; return n; });
      if (props.onChange) props.onChange(rowId, colId, v);
    }
    function avg(rowId) {
      var sum = 0, w = 0;
      cols.forEach(function (c) { var n = parse(grades[rowId] && grades[rowId][c.id]); if (n != null && !isNaN(n)) { sum += n * (c.weight || 1); w += (c.weight || 1); } });
      return w ? sum / w : null;
    }
    return h("div", { className: "na-grid-wrap" }, h("table", { className: "na-grid" },
      props.caption ? h("caption", null, props.caption) : null,
      h("thead", null, h("tr", null,
        h("th", { scope: "col" }, props.nameLabel || "Aluno"),
        cols.map(function (c) { return h("th", { key: c.id, scope: "col" }, c.label, c.weight ? h("small", null, "peso " + c.weight) : null); }),
        h("th", { scope: "col" }, props.averageLabel || "Média"))),
      h("tbody", null, (props.rows || []).map(function (r) {
        var a = avg(r.id);
        return h("tr", { key: r.id },
          h("th", { scope: "row" }, r.name),
          cols.map(function (c) {
            var raw = grades[r.id] && grades[r.id][c.id], n = parse(raw), bad = n != null && (isNaN(n) || n < min || n > max);
            return h("td", { key: c.id }, h("input", {
              className: "na-cell-input", inputMode: "decimal", value: raw == null ? "" : String(raw).replace(".", ","),
              "aria-label": c.label + ", " + r.name, "aria-invalid": bad ? "true" : undefined, title: bad ? "Use um valor entre " + min + " e " + max : undefined,
              onChange: function (e) { set(r.id, c.id, e.target.value); }
            }));
          }),
          h("td", { className: cx("na-avg", a != null && a < passing && "na-avg-low") }, fmt(a), a != null && a < passing ? h("span", { className: "na-avg-note" }, "abaixo de " + fmt(passing)) : null));
      }))));
  }

  function ProgressTrail(props) {
    var total = props.total || 4, done = Math.max(0, Math.min(total, props.done || 0)), parts = [];
    for (var i = 0; i < total; i++) {
      if (i) parts.push(h("span", { key: "l" + i, className: cx("na-trail-link", i <= done && "na-trail-link-done"), "aria-hidden": "true" }));
      parts.push(h("span", { key: "s" + i, className: cx("na-trail-step", i < done && "na-trail-done", i === done && "na-trail-current"), "aria-hidden": "true" }));
    }
    return h("div", { className: "na-trail", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": total, "aria-valuenow": done, "aria-label": props.label || "Progresso" },
      parts, props.caption ? h("span", { className: "na-trail-label" }, props.caption) : null);
  }

  function Notice(props) {
    var tone = props.tone || "info";
    return h("div", { className: cx("na-notice", "na-notice-" + tone), role: tone === "danger" ? "alert" : "status" }, Icon(tone),
      h("div", null, props.title ? h("strong", { className: "na-notice-title" }, props.title) : null, props.children,
        props.action ? h("div", { className: "na-notice-action" }, props.action) : null));
  }

  function EmptyState(props) {
    return h("section", { className: "na-empty" },
      h("svg", { className: "na-empty-art", viewBox: "0 0 56 56", "aria-hidden": "true" },
        h("rect", { x: 14, y: 14, width: 28, height: 28, rx: 5, transform: "rotate(45 28 28)", fill: "var(--surface-sunken)", stroke: "var(--line-strong)", strokeDasharray: "4 4" })),
      h("h3", { className: "na-empty-title" }, props.title),
      props.children ? h("p", { className: "na-empty-text" }, props.children) : null,
      props.actions ? h("div", { className: "na-empty-actions" }, props.actions) : null);
  }

  function Aurora(props) {
    return h(props.as || "div", { className: cx("na-aurora", props.className), style: props.style },
      h("div", { className: "na-aurora-veil", "aria-hidden": "true" }), props.children);
  }

  window.NotaA = Object.assign(window.NotaA || {}, {
    Button: Button, TextField: TextField, Select: Select, Chip: Chip, Tabs: Tabs, SideNav: SideNav,
    GradeGrid: GradeGrid, ProgressTrail: ProgressTrail, Notice: Notice, EmptyState: EmptyState, Aurora: Aurora
  });
})();
