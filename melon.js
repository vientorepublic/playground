/**
 * 멜론(Melon) 웹사이트의 데이터를 크롤링하고 JSON으로 변환하는 작업을 단순화하도록 도와주는 모듈
 * 활용 방법과 예시에 대한 코드를 남깁니다.
 *
 * 기본적으로 모든 개별 곡에 대한 데이터는 `ISongData` 인터페이스로 표현됩니다.
 * 추가 필드가 필요한 경우 다른 인터페이스에서 확장됩니다.
 * 자세한 타입 정의는 각 클래스/메소드의 JSDoc, 또는 melona 프로젝트의 README 문서를 참고하세요.
 */

import { MelonKeywords, MelonSearch, SearchSection } from "melona";

const melonKeywords = new MelonKeywords();
const keywords = await melonKeywords.getKeywords();

function printKeywords(keywords) {
  printTrendingKeywords(keywords.trending);
  printPopularKeywords(keywords.popular);
}

function printTrendingKeywords(trending) {
  console.log("🔥 실시간 급상승 키워드:");
  trending.forEach((keyword) => {
    const changeIcon = getChangeIcon(keyword.rankChanges);
    console.log(`${keyword.rank}위: ${keyword.keyword} ${changeIcon}`);
  });
}

function printPopularKeywords(popular) {
  console.log("\n⭐ 인기 키워드:");
  popular.forEach((keyword) => {
    console.log(`${keyword.rank}위: ${keyword.keyword} (${keyword.rankChanges})`);
  });
}

function getChangeIcon(rankChanges) {
  if (rankChanges.includes("상승")) return "↗️";
  if (rankChanges.includes("하락")) return "↘️";
  if (rankChanges.includes("진입")) return "🆕";
  return "➖";
}

printKeywords(keywords);

const melonSearch = new MelonSearch();
const search = await melonSearch.searchSong({
  query: "달의하루", // 검색어(제목, 아티스트, 앨범 이름 등)
  section: SearchSection.ARTIST, // 검색 필터
});

console.log("\n🔍 검색 결과:");
search.forEach((item, index) => {
  console.log(`${index + 1}: ${item.title} by ${item.artist}`);
});
