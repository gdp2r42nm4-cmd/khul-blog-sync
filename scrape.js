const fs = require('fs');

const BLOG_URL = 'https://www.khul.co.za/blog';
const GIST_ID = process.env.GIST_ID;
const GIST_TOKEN = process.env.GIST_TOKEN;

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KhulBot/1.0)' }
  });
  return res.text();
}

function extractArticles(html) {
  const articles = [];
  const blocks = html.match(/<article name="blog_post"[\s\S]*?<\/article>/g) || [];

  blocks.forEach(block => {
    const titleMatch = block.match(/href="(\/blog\/[^"]+)"[^>]*class="[^"]*o_blog_post_title[^"]*"[^>]*>([\s\S]*?)<\/a>/);

    const imgMatch = block.match(/background-image:\s*url\(&#34;([^&]+)&#34;\)/) ||
                      block.match(/background-image:\s*url\(["']?([^"')]+)["']?\)/);

    const dateMatch = block.match(/<time[^>]*>([^<]+)<\/time>/);

    const blogNameMatch = block.match(/fa-folder-open[^<]*<\/i>\s*<a[^>]*>([^<]+)<\/a>/);

    if (titleMatch) {
      const url = titleMatch[1];
      const title = titleMatch[2].replace(/<[^>]+>/g, '').trim();

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

async function updateGist(articles) {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${GIST_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      files: {
        'Khulpost.json': {
          content: JSON.stringify(articles, null, 2)
        }
      }
    })
  });

  const responseBody = await res.json();
  console.log('Gist API response status:', res.status);
  console.log('Gist API response URL:', responseBody.html_url);
  console.log('Gist API owner:', responseBody.owner ? responseBody.owner.login : 'NONE');
  console.log('Gist updated_at:', responseBody.updated_at);

  if (!res.ok) {
    throw new Error(`Gist update failed: ${res.status} ${JSON.stringify(responseBody)}`);
  }

  console.log(`Updated gist with ${articles.length} articles`);
}

async function main() {
  console.log('Fetching blog page...');
  const html = await fetchHTML(BLOG_URL);

  console.log('Extracting articles...');
  const articles = extractArticles(html);

  console.log(`Found ${articles.length} articles`);

  if (articles.length === 0) {
    console.error('No articles found — aborting to avoid wiping the gist');
    process.exit(1);
  }

  await updateGist(articles);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
