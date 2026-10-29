// Light-hearted one-liners shown under the Verdict, keyed by scene.

import { lang } from "./i18n.js";

const QUIPS_PL = {
  calm: [
    "Ty i wulkanizator widujecie się tylko przy przeglądzie. I dobrze.",
    "Kolejka do wulkanizatora? Znasz ją tylko z wiadomości.",
    "Śnieg, upał, grad – Twoje opony wzruszają ramionami.",
    "Inni dzwonią po termin do wulkanizatora. Ty – po pizzę.",
    "Zimówki w piwnicy? U Ciebie w piwnicy są tylko przetwory.",
  ],
  snow: [
    "Zima nie pyta, czy masz już termin u wulkanizatora.",
    "Letnie opony na zimnym asfalcie to jak klapki na Kasprowym.",
    "Dzwoń do wulkanizatora, zanim zrobi to pół Polski.",
    "Pierwszy śnieg co roku zaskakuje drogowców. Ciebie nie musi.",
    "Bałwan już ma zimówki. A Ty?",
    "Opony letnie poniżej 7°C twardnieją jak masło z lodówki.",
  ],
  sun: [
    "Zimówki w ciepłe dni ścierają się szybciej niż Twoja cierpliwość w korku.",
    "Słońce wyszło. Kolejka u wulkanizatora też.",
    "Czas schować zimówki do piwnicy. Obok sanek.",
    "Zimowe opony latem? Szkoda gumy i paliwa.",
    "Wiosna! Zimówki mogą iść na zasłużony urlop.",
  ],
  leaves: [
    "Spokojnie. Na razie z nieba lecą liście, nie płatki.",
    "Jeszcze nie. Ale numer do wulkanizatora miej pod ręką.",
    "Letnie opony mówią: jeszcze trochę pojeździmy.",
    "Zimówki odpoczywają w piwnicy. Daj im jeszcze chwilę.",
    "Grabienie liści – tak. Zmiana opon – jeszcze nie.",
  ],
  rain: [
    "Kwiecień plecień, bo przeplata – trochę zimy, trochę lata.",
    "Jeszcze nie. Zimówki mają w tym sezonie coś do powiedzenia.",
    "Ostatni przymrozek lubi przyjść, gdy już nikt się go nie spodziewa.",
    "Letnie opony niech jeszcze poleżą. Im też należy się urlop.",
    "Cierpliwości. Bociany też jeszcze nie wszystkie wróciły.",
  ],
};

const QUIPS_EN = {
  calm: [
    "You and the tire shop only meet at your annual service. As it should be.",
    "The queue at the tire shop? You've only heard about it on the news.",
    "Snow, heatwave, hail – your tires just shrug.",
    "Everyone else is booking a tire change. You're booking brunch.",
    "Winter tires in the basement? Your basement has room for a ping-pong table.",
  ],
  snow: [
    "Winter doesn't care whether you've booked the tire shop yet.",
    "Summer tires on cold asphalt are like flip-flops on a ski slope.",
    "Call the tire shop before the rest of town does.",
    "The first snow surprises the road crews every year. It doesn't have to surprise you.",
    "The snowman already has his winter tires on. Do you?",
    "Below 7°C summer tires go as hard as butter straight from the fridge.",
  ],
  sun: [
    "Winter tires on warm roads wear out faster than your patience in traffic.",
    "The sun is out. So is the queue at the tire shop.",
    "Time to put the winter tires in the basement. Next to the sled.",
    "Winter tires in summer? A waste of rubber and fuel.",
    "Spring! Your winter tires have earned a holiday.",
  ],
  leaves: [
    "Relax. It's leaves falling from the sky, not snowflakes.",
    "Not yet. But keep the tire shop's number handy.",
    "Your summer tires say: just a few more rides.",
    "The winter tires are resting in the basement. Give them a moment.",
    "Raking leaves – yes. Changing tires – not yet.",
  ],
  rain: [
    "Spring weather: a bit of winter, a bit of summer.",
    "Not yet. Winter tires still have something to say this season.",
    "The last frost loves to show up when nobody expects it.",
    "Let the summer tires rest a little longer. They deserve a break too.",
    "Patience. Spring is still making up its mind.",
  ],
};

export const QUIPS = lang === "pl" ? QUIPS_PL : QUIPS_EN;

export function pickQuip(scene, previous) {
  const pool = QUIPS[scene] ?? [];
  const options = pool.length > 1 ? pool.filter((q) => q !== previous) : pool;
  return options[Math.floor(Math.random() * options.length)] ?? "";
}
