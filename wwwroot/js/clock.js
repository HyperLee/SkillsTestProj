(() => {
  "use strict";

  const dateDisplay = document.getElementById("clock-date");
  const timeDisplay = document.getElementById("clock-time");
  const timezoneDisplay = document.getElementById("clock-timezone");
  const pad = value => String(value).padStart(2, "0");

  function updateClock() {
    const now = new Date();
    const date = `${String(now.getFullYear()).padStart(4, "0")}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = -now.getTimezoneOffset();
    const utcOffset = `UTC${offset >= 0 ? "+" : "-"}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;

    dateDisplay.textContent = date;
    dateDisplay.dateTime = date.replaceAll("/", "-");
    timeDisplay.textContent = time;
    timeDisplay.dateTime = time;
    timezoneDisplay.textContent = timezone ? `${timezone} · ${utcOffset}` : utcOffset;
  }

  updateClock();
  window.setInterval(updateClock, 250);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateClock();
  });
  window.addEventListener("pageshow", updateClock);
  window.addEventListener("focus", updateClock);
})();
