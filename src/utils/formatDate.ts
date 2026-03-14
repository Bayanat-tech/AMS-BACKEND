export function formatDate(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  let ordinal;
  if (day > 3 && day < 21) ordinal = "th";
  else {
    switch (day % 10) {
      case 1:
        ordinal = "st";
        break;
      case 2:
        ordinal = "nd";
        break;
      case 3:
        ordinal = "rd";
        break;
      default:
        ordinal = "th";
        break;
    }
  }

  // Return date with superscript ordinal
  return `${day}<sup>${ordinal}</sup> ${month} ${year} ${hours}:${minutes}`;
}
