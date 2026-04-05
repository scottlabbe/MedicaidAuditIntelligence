**Operating Model**

For this site, the right workflow is:

- Submit the sitemap once in Search Console.
- Let Google discover most new URLs through the sitemap and internal links.
- Use URL Inspection for important pages, spot checks, and troubleshooting.
- Review Search Console reports on a schedule instead of manually submitting every page.

The key distinction to remember is:

- `URL is available to Google` means Google can probably crawl it.
- `URL is on Google` means it is actually indexed.

**What Should Be Indexed**

For this codebase, these pages should generally be indexable:

- Home: [`/Users/scottlabbe/Projects/MedicaidAuditIntelligence/client/src/pages/home.tsx`]( /Users/scottlabbe/Projects/MedicaidAuditIntelligence/client/src/pages/home.tsx )
- About: [`/Users/scottlabbe/Projects/MedicaidAuditIntelligence/client/src/pages/about.tsx`]( /Users/scottlabbe/Projects/MedicaidAuditIntelligence/client/src/pages/about.tsx )
- Dashboard, if you want it to rank: [`/Users/scottlabbe/Projects/MedicaidAuditIntelligence/client/src/pages/dashboard.tsx`]( /Users/scottlabbe/Projects/MedicaidAuditIntelligence/client/src/pages/dashboard.tsx )
- State pages with real content: [`/Users/scottlabbe/Projects/MedicaidAuditIntelligence/client/src/pages/state-detail.tsx`]( /Users/scottlabbe/Projects/MedicaidAuditIntelligence/client/src/pages/state-detail.tsx )
- Report detail pages: [`/Users/scottlabbe/Projects/MedicaidAuditIntelligence/client/src/pages/report-detail.tsx`]( /Users/scottlabbe/Projects/MedicaidAuditIntelligence/client/src/pages/report-detail.tsx )

These should generally stay out of the index:

- Filtered search URLs like `/explore?state=...&year=...`
- Not-found pages
- Empty state pages
- Broken or duplicate variants

Your code already handles some of this correctly with `noindex` on filtered explore views and invalid pages in [`/Users/scottlabbe/Projects/MedicaidAuditIntelligence/client/src/pages/explore.tsx#L145`]( /Users/scottlabbe/Projects/MedicaidAuditIntelligence/client/src/pages/explore.tsx#L145 ).

**One-Time Setup Procedure**

1. In Search Console, make sure the correct property is verified for your canonical site.
2. Confirm the live sitemap is submitted: `https://www.medicaidintelligence.com/sitemap.xml`.
3. Confirm `robots.txt` is live and points to that sitemap in [`/Users/scottlabbe/Projects/MedicaidAuditIntelligence/server/routes.ts#L107`]( /Users/scottlabbe/Projects/MedicaidAuditIntelligence/server/routes.ts#L107 ).
4. Confirm the canonical host is the one you want Google to index; your server already forces canonical redirects in [`/Users/scottlabbe/Projects/MedicaidAuditIntelligence/server/index.ts`]( /Users/scottlabbe/Projects/MedicaidAuditIntelligence/server/index.ts ).
5. Inspect 3-5 representative URLs, not every URL:
   - home
   - one state page
   - one report page
   - `/explore`
   - one filtered explore URL that should be `noindex`

**Procedure When Publishing a New Page**

For a new report or state page:

1. Confirm the page returns `200`.
2. Confirm it is not blocked by `robots.txt`.
3. Confirm it does not have `noindex`.
4. Confirm it has the correct canonical URL.
5. Confirm it is included in the sitemap.
6. Confirm there is at least one internal link path to it.
7. For especially important pages, run URL Inspection and click `Request indexing`.
8. Otherwise, do nothing else and let sitemap discovery handle it.

For this project, new report and state pages should be added to the sitemap automatically by [`/Users/scottlabbe/Projects/MedicaidAuditIntelligence/server/seo.ts#L736`]( /Users/scottlabbe/Projects/MedicaidAuditIntelligence/server/seo.ts#L736 ).

**Weekly Maintenance Procedure**

Once a week:

1. Open `Sitemaps` in Search Console and confirm the sitemap was read successfully.
2. Open `Page indexing` and look for spikes in:
   - `Crawled - currently not indexed`
   - `Discovered - currently not indexed`
   - `Excluded by noindex`
   - `Not found (404)`
3. Inspect a few newly published report URLs.
4. Check `Performance` and see which pages are getting impressions and clicks.
5. If an important page has had no indexing movement after about 1-2 weeks, inspect that page directly.

**Monthly Maintenance Procedure**

Once a month:

1. Review which page types are actually earning impressions.
2. Decide whether `dashboard` should stay indexable or become `noindex` if it is weak for search intent.
3. Check for thin pages, duplicate pages, and empty pages.
4. Confirm the sitemap count roughly matches the number of real indexable URLs.
5. Check whether your content volume is approaching sitemap limits.

**Troubleshooting Procedure For A Page That Won’t Index**

If a page is not indexing:

1. Inspect the exact URL in Search Console.
2. Check whether the result says `available to Google` or `on Google`.
3. Verify the live test.
4. Check:
   - HTTP `200`
   - no `noindex`
   - correct canonical
   - unique content
   - included in sitemap
   - internal links to it
5. If all of that looks good, wait a bit. New pages often just need time.
6. If the page is important, request indexing once.

**Site-Specific Notes**

Your SEO foundation is already in place:

- `robots.txt`: [`/Users/scottlabbe/Projects/MedicaidAuditIntelligence/server/routes.ts#L107`]( /Users/scottlabbe/Projects/MedicaidAuditIntelligence/server/routes.ts#L107 )
- dynamic sitemap: [`/Users/scottlabbe/Projects/MedicaidAuditIntelligence/server/seo.ts#L736`]( /Users/scottlabbe/Projects/MedicaidAuditIntelligence/server/seo.ts#L736 )
- canonical and robots tags: [`/Users/scottlabbe/Projects/MedicaidAuditIntelligence/client/src/components/seo/PageMeta.tsx`]( /Users/scottlabbe/Projects/MedicaidAuditIntelligence/client/src/components/seo/PageMeta.tsx )

One thing to keep an eye on: the sitemap currently loads up to `5000` reports in one query. If the library grows past that, you should split into multiple sitemaps or a sitemap index. That limit is visible in [`/Users/scottlabbe/Projects/MedicaidAuditIntelligence/server/seo.ts#L751`]( /Users/scottlabbe/Projects/MedicaidAuditIntelligence/server/seo.ts#L751 ).

Sources:
- [URL Inspection tool](https://support.google.com/webmasters/answer/9012289?hl=en)
- [Learn about sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
- [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google Search technical requirements](https://developers.google.com/search/docs/essentials/technical)
- [How Google Search works](https://developers.google.com/search/docs/fundamentals/how-search-works)

If you want, I can turn this into a single-page “SEO operations playbook” for this project with exact checks for each page type and a simple yes/no decision tree.