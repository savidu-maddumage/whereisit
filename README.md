This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Supabase setup

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the Supabase project API settings. Use the publishable/anon key only; never put a service-role key in a `NEXT_PUBLIC_` variable.
2. In the Supabase Dashboard, open **SQL Editor**, paste in `supabase/setup.sql`, and run it. This creates the reports and feedback tables, public item-image bucket, and row-level security policies.
3. Restart the Next.js development server after setting the environment variables.

When Supabase is configured, reports, photos, and feedback are stored in the shared project. Without it, the app keeps using browser-local storage. Report contact email addresses and phone numbers are readable to anyone with access to the public reports table, so reporters are warned before publishing. Email and SMS links open a message draft; automatic delivery still needs a mail or SMS provider integration.

## Admin panel

Open `/admin` (for local development, `http://localhost:3000/admin`) for a separate admin sign-in and shared-report manager. The panel supports marking a report found/lost, permanently deleting a report, and reviewing or deleting community feedback. It requires Supabase; browser-local reports and sample cards are not managed there.

To enable it, create an account in Supabase Dashboard under **Authentication > Users**, then set that user's **app metadata** to `{"role":"admin"}`. Use app metadata, not user metadata, because users must not be able to grant themselves admin access. Sign in at `/admin` with that account. Run the updated `supabase/setup.sql` in the SQL Editor to add the admin-only update and delete policies. The account must sign in again after changing its metadata so its session receives the admin role.

To add the three optional demo reports to the shared admin list, run `supabase/add-sample-items.sql` in the SQL Editor after `setup.sql`. Their contact details are fictional placeholders and cannot reach a real person.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
