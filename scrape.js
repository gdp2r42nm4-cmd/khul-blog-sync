function extractArticles(html) {
  const articles = [];
  const blocks = html.match(/<article name="blog_post"[\s\S]*?<\/article>/g) || [];

  blocks.forEach(block => {
    // Title + URL — first <a> with class o_blog_post_title
    const titleMatch = block.match(/href="(\/blog\/[^"]+)"[^>]*class="[^"]*o_blog_post_title[^"]*"[^>]*>([\s\S]*?)<\/a>/);

    // Image — background-image url inside style attribute
    const imgMatch = block.match(/background-image:\s*url\(&#34;([^&]+)&#34;\)/) ||
                      block.match(/background-image:\s*url\(["']?([^"')]+)["']?\)/);

    // Date — plain text inside <time>
    const dateMatch = block.match(/<time[^>]*>([^<]+)<\/time>/);

    // Blog category name — text inside the <a> right after fa-folder-open
    const blogNameMatch = block.match(/fa-folder-open[^<]*<\/i>\s*<a[^>]*>([^<]+)<\/a>/);

    if (titleMatch) {
      const url = titleMatch[1];
      const title = titleMatch[2].replace(/<[^>]+>/g, '').trim();

      // Extract blogId from URL slug, e.g. /blog/kmnsports-16/...
      const slugMatch = url.match(/^\/blog\/[a-z0-9-]+-(\d+)\//);
      const blogId = slugMatch ? parseInt(slugMatch[1], 10) : null;

      articles.push({
        title: title,
        url: 'https://www.khul.co.za' + url,
        image: imgMatch ? 'https://www.khul.co.za' + imgMatch[1] : '',
        date: dateMatch ? dateMatch[1].trim() : '',
        blogName: blogNameMatch ? blogNameMatch[1].trim() : '',
        blogId: blogId,
        excerpt: ''
      });
    }
  });

  return articles;
}
