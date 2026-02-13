import { runGroundNewsScrape } from "../../groundnews_scrape_cdp.mjs";

export async function discoverStoryLinks(options = {}) {
  return runGroundNewsScrape(options);
}
