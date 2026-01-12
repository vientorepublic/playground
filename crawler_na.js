import { PalCrawl } from "pal-crawl";

const palCrawl = new PalCrawl();
const table = await palCrawl.get();

console.log(table);
