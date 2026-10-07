# Joining a shared board without an account

An invite link now offers **Join without an account**. It uses Supabase's *anonymous sign-in*: a real but credential-less user, so every existing row-level-security rule, board membership and role works unchanged. `accept_invite` already works for any authenticated user.

## One-time setting (Supabase dashboard)
**Authentication → Sign In / Providers → Allow anonymous sign-ins: ON.** Until it is on, "Join without an account" tells the person it is not available yet and offers normal sign-in instead. Consider turning on CAPTCHA / rate limits for anonymous sign-ins to stop abuse.

## Behaviour
* The age check (`ensureAgeAttested`) still runs first, exactly as for an account. Under-13s are still stopped.
* An invitation tied to a specific e-mail address cannot be joined anonymously (no e-mail to match): the person is told to sign in with that address.
* Leaving (Sign out) asks first and explains there is nothing to sign back in to; a new invitation is needed. A Google / account link-up for guests can be added later with `linkIdentity`.
* Guests are ordinary board members with the role on the invitation (editor or viewer).

## Not covered
Cleaning up abandoned anonymous users (a scheduled job deleting anonymous users with no memberships after N days) is not set up.
