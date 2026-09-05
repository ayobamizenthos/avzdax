const { savePost, readIndex } = require('../api/_lib/store')

const seed = require('../api/_lib/seed/newsroom.json')

async function run() {
  const existing = await readIndex()
  if (existing.length && process.env.FORCE !== '1') {
    console.log(`Store already holds ${existing.length} entries. Set FORCE=1 to seed anyway.`)
    return
  }

  for (const post of seed) {
    await savePost(post)
    process.stdout.write(`  ${post.status === 'published' ? 'live ' : 'draft'} ${post.slug}\n`)
  }

  const index = await readIndex()
  console.log('')
  console.log(`seeded ${seed.length} entries, index holds ${index.length}, published ${index.filter((c) => c.status === 'published').length}`)
}

run().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
