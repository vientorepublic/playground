import { MelonKeywords } from "melona";

const melonKeywords = new MelonKeywords();
const keywords = await melonKeywords.getKeywords();

console.log("🔥 실시간 급상승 키워드:");
keywords.trending.forEach((keyword) => {
  const changeIcon = keyword.rankChanges.includes("상승")
    ? "↗️"
    : keyword.rankChanges.includes("하락")
      ? "↘️"
      : keyword.rankChanges.includes("신규")
        ? "🆕"
        : "➖";
  console.log(`${keyword.rank}위: ${keyword.keyword} ${changeIcon}`);
});

console.log("\n⭐ 인기 키워드:");
keywords.popular.forEach((keyword) => {
  console.log(`${keyword.rank}위: ${keyword.keyword} (${keyword.rankChanges})`);
});

// import { MelonSearch, SearchSection } from "melona";

// const melonSearch = new MelonSearch();
// const search = await melonSearch.searchSong({
//   query: "달의하루",
//   section: SearchSection.ARTIST,
// });

// console.log(search);

// // import { MelonKeywords } from "melona";

// // const melonKeywords = new MelonKeywords();
// // const keywords = await melonKeywords.getKeywords();

// // console.log(keywords);
