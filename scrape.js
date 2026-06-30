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
    const bodyStart = html.indexOf('<body');
  const bodySample = html.substring(bodyStart, bodyStart + 4000);
  console.log('--- BODY SAMPLE START ---');
  console.log(bodySample);
  console.log('--- BODY SAMPLE END ---');

  const articles = [];
  const blocks = html.match(/<article[\s\S]*?<\/article>/g) || [];

  blocks.forEach(block => {
    const titleMatch = block.match(/<h\d[^>]*class="[^"]*">([\s\S]*?)<\/h\d>/);
    const linkMatch = block.match(/href="(\/blog\/[^"]+)"/);
    const imgMatch = block.match(/<img[^>]+src="([^"]+)"/);
    const dateMatch = block.match(/datetime="([^"]+)"/);
    const blogNameMatch = block.match(/data-blog-name="([^"]+)"/) || block.match(/class="[^"]*o_blog_post_label[^"]*">([^<]+)</);

    if (titleMatch && linkMatch) {
      articles.push({
        title: titleMatch[1].replace(/<[^>]+>/g, '').trim(),
        url: 'https://www.khul.co.za' + linkMatch[1],
        image: imgMatch ? imgMatch[1] : '',
        date: dateMatch ? dateMatch[1] : '',
        blogName: blogNameMatch ? blogNameMatch[1].trim() : '',
        blogId: null,
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

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gist update failed: ${res.status} ${err}`);
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
