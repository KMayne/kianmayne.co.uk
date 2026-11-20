# Comments (Artalk)

Comments under the blog posts, using [Artalk](https://artalk.js.org) 2.10.1 on the home Kubernetes
cluster, exposed to the internet with Tailscale Funnel. This folder isn't published with the site
(only `public/` is).

**Every new comment is hidden until you approve it.** The reader sees "Pending, visible only to
commenter"; nobody else sees it until you approve it in the dashboard.

What the config (`artalk.yml`) changes from Artalk's defaults, and why:

- `moderator.pending_default: true`: the approval queue.
- `http.proxy_header: X-Forwarded-For`: Funnel sets this to the visitor's address (overwriting
  anything the visitor sent), so Artalk sees each reader's own address.
- Captcha: Artalk's built-in picture captcha, shown only after 3 comments within 60 seconds. This
  is Artalk's rate limit; normal readers never see it. **Later:** Artalk added support for
  [Cap](https://capjs.js.org) (a self-hosted, invisible proof-of-work captcha) after 2.10.1. Once a
  release includes it, run Cap's standalone server next to Artalk and set `captcha.captcha_type:
  capjs` with its `key_id`, `secret_key` and `api_endpoint`.
- No third parties: emoji (from a CDN), Gravatar, image uploads and the version check are off. The
  blog draws its own avatars (`public/blog/blog.js`).
- `admin_notify`: emails you about every new comment, pending ones included (once email is set up).

Readers give a nickname and an email address. Artalk never shows the email to other readers.
Artalk also stores each commenter's full IP address (for moderation and its rate limit), and shows
it only in the dashboard.

## Deploy

Needs the Tailscale Kubernetes operator with Funnel allowed for its nodes (see
`services/poll/README.md`).

1. Hash your admin password (bcrypt), e.g.:

   ```sh
   docker run --rm httpd:2.4-alpine htpasswd -nbB admin '<your password>' | cut -d: -f2
   ```

2. Create the secret (never commit these values):

   ```sh
   kubectl create namespace comments
   kubectl -n comments create secret generic artalk \
     --from-literal=ATK_APP_KEY="$(openssl rand -hex 32)" \
     --from-literal=ATK_ADMIN_USERS_0_NAME='Kian' \
     --from-literal=ATK_ADMIN_USERS_0_EMAIL='<your email>' \
     --from-literal=ATK_ADMIN_USERS_0_PASSWORD='(bcrypt)<the hash from step 1>'
   ```

3. Apply and find the public URL:

   ```sh
   kubectl apply -k services/artalk
   kubectl -n comments get ingress artalk                 # ADDRESS: comments.<tailnet>.ts.net
   curl https://comments.<tailnet>.ts.net/api/v2/version  # {"app":"artalk","version":"2.10.1",...}
   ```

4. Put that URL in `commentsHost` at the top of `public/blog/blog.js`, and redeploy the site.

## Moderating

Open `https://comments.<tailnet>.ts.net/sidebar/` and sign in with your admin email and password.
**Comment → Pending** lists what's waiting. On each comment, **Pending** approves it (it toggles the
pending state off), **Delete** removes it.

### Get an email for each new comment

Add your SMTP details to the secret, then restart:

```sh
kubectl -n comments patch secret artalk --type merge -p '{"stringData":{
  "ATK_EMAIL_ENABLED":"true",
  "ATK_EMAIL_SEND_TYPE":"smtp",
  "ATK_EMAIL_SEND_NAME":"Kian Mayne",
  "ATK_EMAIL_SEND_ADDR":"<from address>",
  "ATK_EMAIL_SMTP_HOST":"<smtp host>",
  "ATK_EMAIL_SMTP_PORT":"587",
  "ATK_EMAIL_SMTP_USERNAME":"<user>",
  "ATK_EMAIL_SMTP_PASSWORD":"<password>"}}'
kubectl -n comments rollout restart deploy/artalk
```

With email on, readers who leave an address also get an email when someone replies to them.

## Run locally

```sh
docker run -d --name artalk --user 1000:1000 -p 8090:23366 \
  -v "$PWD/services/artalk/artalk.yml:/etc/artalk/artalk.yml:ro" -v /tmp/artalk:/data \
  -e ATK_APP_KEY=local-only -e ATK_ADMIN_USERS_0_NAME=Kian -e ATK_ADMIN_USERS_0_EMAIL=admin@example.com \
  -e 'ATK_ADMIN_USERS_0_PASSWORD=(bcrypt)<hash>' \
  --entrypoint /usr/bin/artalk artalk/artalk-go:2.10.1 \
  server --config /etc/artalk/artalk.yml --host 0.0.0.0 --port 23366
```

`/tmp/artalk` must be writable by uid 1000. With the site served on `localhost:8080`, `blog.js` uses
`localhost:8090` automatically; the dashboard is at `http://localhost:8090/sidebar/`.
