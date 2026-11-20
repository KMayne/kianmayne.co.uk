# Comments (Isso)

Comments under the blog posts, using [Isso](https://isso-comments.de) on the home Kubernetes
cluster, exposed to the internet with Tailscale Funnel. This folder isn't published with the site
(only `public/` is).

**Every new comment is hidden until you approve it.** The reader sees "Comment in queue for
moderation"; nobody else sees it until you validate it. Unapproved comments are deleted after 30
days.

- `isso.cfg`: the settings, without secrets. Joined at startup with `secrets.cfg` from the `isso`
  Kubernetes Secret, because Isso reads a single config file.
- `proxied.py`: runs Isso behind the Funnel proxy. Funnel sets `X-Forwarded-For` to the visitor's
  address (overwriting anything the visitor sent), and this trusts exactly that one hop, so Isso's
  per-reader rate limit (2 comments a minute) and vote counting see real readers. Isso stores the
  address anonymised (`203.0.113.0`).
- `kustomization.yaml` + `k8s/`: namespace, PVC (SQLite), Deployment pinned to
  `ghcr.io/isso-comments/isso:0.14.0`, Service and a Tailscale Funnel Ingress.
- Posts load the comments from `public/blog/blog.js` once the reader scrolls near them. Threads are
  keyed by the page path, so www, the apex and local previews share one thread.

## Deploy

Needs the Tailscale Kubernetes operator with Funnel allowed for its nodes (see
`services/poll/README.md`).

1. Write `secrets.cfg` somewhere outside the repo (never commit it):

   ```ini
   [admin]
   enabled = true
   password = <a long random password>

   [hash]
   salt = <a random string>
   ```

   For example, `openssl rand -base64 24` for each.

2. Create the secret and apply:

   ```sh
   kubectl create namespace comments
   kubectl -n comments create secret generic isso --from-file=secrets.cfg=./secrets.cfg
   kubectl apply -k services/isso
   kubectl -n comments get ingress isso         # ADDRESS: comments.<tailnet>.ts.net
   curl https://comments.<tailnet>.ts.net/info  # "moderation": true
   ```

3. Put that URL in two places, then re-apply and redeploy the site:
   - `public-endpoint` in `isso.cfg`
   - `commentsHost` at the top of `public/blog/blog.js`

## Moderating

Open `https://comments.<tailnet>.ts.net/admin/` and sign in with the admin password. **Pending**
lists comments waiting for you: **Validate** publishes one, **Delete** removes it.

### Optional: an email for each new comment

With email set up, each new comment arrives with one-click **Activate** and **Delete** links, so you
don't need to check the admin page. Add an `[smtp]` section to `secrets.cfg`:

```ini
[smtp]
username = <user>
password = <password>
host = <smtp host>
port = 587
security = starttls
to = <your email>
from = Kian's blog <comments@example.com>
```

Set `notify = smtp` in `isso.cfg`, then update the secret and restart:

```sh
kubectl -n comments create secret generic isso --from-file=secrets.cfg=./secrets.cfg \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -k services/isso
kubectl -n comments rollout restart deploy/isso
```

## Run locally

```sh
python3 -m venv /tmp/isso-venv && /tmp/isso-venv/bin/pip install isso==0.14.0 gunicorn
cat isso.cfg secrets.cfg | sed 's#/db/comments.db#/tmp/comments.db#' > /tmp/isso.cfg
cd services/isso && ISSO_SETTINGS=/tmp/isso.cfg \
  /tmp/isso-venv/bin/gunicorn -b 127.0.0.1:8090 --pythonpath . proxied:application
```

With the site served on `localhost:8080`, `blog.js` uses `localhost:8090` automatically. The admin
page is at `http://localhost:8090/admin/`.
