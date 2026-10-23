// Light-hearted one-liners shown under the Verdict, keyed by scene.

export const QUIPS = {
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

export function pickQuip(scene, previous) {
  const pool = QUIPS[scene] ?? [];
  const options = pool.length > 1 ? pool.filter((q) => q !== previous) : pool;
  return options[Math.floor(Math.random() * options.length)] ?? "";
}
