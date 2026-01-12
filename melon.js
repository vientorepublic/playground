import { MelonSearch, SearchSection } from "melona";

const melonSearch = new MelonSearch();
const search = await melonSearch.searchSong({
  query: "달의하루",
  section: SearchSection.ARTIST,
});

console.log(search);

// // import { MelonKeywords } from "melona";

// // const melonKeywords = new MelonKeywords();
// // const keywords = await melonKeywords.getKeywords();

// // console.log(keywords);
