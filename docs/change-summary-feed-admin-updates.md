# Change Summary: Feed, Posting, Admin, and DB Updates

## Suggested Branch

`feature/feed-cover-admin-category-updates`

## Suggested Commit

```text
feat: improve feed covers, posting guidance, and admin taxonomy
```

## Commit Body

```text
- add a DB connection check script and verify MySQL before starting the Node API
- show the first uploaded post image as the community feed cover image
- improve lost-post verification copy and image upload guidance
- allow admins to open post details from moderation
- simplify category management by hiding icon/sort inputs and separating main groups from concrete categories
- prevent nested category levels beyond main group and concrete category
- remove sort-order inputs from admin area and location forms
```

## Updated Areas

- Node API database startup and `check:db` script.
- Post list API response now includes `coverImageUrl`.
- Community post cards render the first uploaded image as the cover.
- Create-post form uses clearer ownership-proof wording.
- Admin moderation has a detail view action for each post.
- Admin category form uses user-friendly labels: main group and concrete category.
- Admin location forms no longer expose ordering fields.

## Verification

```bash
npm run build:api
npm run build:web
```
