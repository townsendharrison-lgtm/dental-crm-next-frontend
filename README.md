Next.js frontend for the **Dental School Guide CRM**. Talks to the Express/Supabase backend in `../backend`.

## Getting Started.

1. Copy the env vars below into `.env.local`:

   ```bash
   # Backend API base URL
   NEXT_PUBLIC_API_URL=http://localhost:5001

   # Supabase (used for client-side access-token refresh)
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```

2. Run the dev server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

- **`proxy.ts`** — Next.js 16's renamed middleware. Handles server-side route protection + role-based redirects using the access-token cookie.
- **`lib/api/`** — Axios client with auth header injection, single-flight token refresh (via Supabase), and normalised error handling. Query keys live in `queryKeys.ts`.
- **`lib/stores/`** — Zustand stores for client/UI state (`uiStore`, `authStore`).
- **`lib/providers/`** — React Query + Auth bootstrap providers (mounted in `app/providers.tsx`).
- **`lib/auth/`** — Cookie helpers, JWT decode, and the role/route-access map (`roles.ts`).
- **`components/ui/`** — Shared component library: `Button`, `Card`, `Badge`, `Modal`, `Table`, `Tabs`, `Dropdown`, form fields, `Avatar`, `Spinner`, `EmptyState`.
- **`components/layout/`** — `Sidebar`, `Header`, `AppShell` (responsive shell), `PageHeader`.
- **`components/auth/RoleGate.tsx`** — Conditionally render UI by role.
- **`app/(app)/`** — Authenticated route group wrapped by `AppShell`. Add feature pages here.
- **`app/login/`** — Public auth page.

### Roles

`ADMIN`, `MENTOR_MANAGER`, `MENTOR`, `STUDENT`, `LETTER_WRITER`, `SETTER`. Route access is centralised in `lib/auth/roles.ts` and navigation in `lib/navigation.ts`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
