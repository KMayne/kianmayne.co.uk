# Poll service

The "What should I write up next?" poll on the blog posts. A single dependency-free Python file
(`server.py`) with SQLite, run on the home Kubernetes cluster and exposed to the internet with
Tailscale Funnel. This folder isn't published with the site (only `public/` is).

- `server.py`: the API (`GET /polls/<id>`, `POST /polls/<id>/vote`, `GET /healthz`).
- `polls.json`: the polls and their options. Edit and re-apply to change them; votes for an
  option you remove are kept in the database but no longer shown.
- `kustomization.yaml` + `k8s/`: namespace, PVC, Deployment (stock `python:3.13-alpine`, script
  mounted from a ConfigMap, so no image to build), Service and a Tailscale Funnel Ingress.

Privacy: no cookies, no IP addresses stored. Each browser makes a random voter id and keeps it in
localStorage, so a reader can change their vote. The client address is only used for an in-memory
rate limit (30 votes an hour).

## Deploy

Needs the [Tailscale Kubernetes operator](https://tailscale.com/kb/1236/kubernetes-operator) on the
cluster, and Funnel allowed for its nodes in the tailnet policy, e.g.:

```jsonc
"nodeAttrs": [
  { "target": ["tag:k8s"], "attr": ["funnel"] }
]
```

Then:

```sh
kubectl apply -k services/poll
kubectl -n poll get ingress poll   # ADDRESS is the public https://poll.<tailnet>.ts.net host
curl https://poll.<tailnet>.ts.net/healthz
```

Put that URL in `pollApi` at the top of `public/blog/blog.js`.

The PVC uses the cluster's default StorageClass; add `storageClassName` in `k8s/poll.yaml` if you
want another.

## Run locally

```sh
cd services/poll
mkdir -p /tmp/poll && POLLS_FILE=polls.json DB_PATH=/tmp/poll/poll.db \
  ALLOWED_ORIGINS=http://localhost:8080 PORT=8099 python3 server.py
```

With the site served on `localhost:8080`, `blog.js` uses `localhost:8099` automatically.

## Results

```sh
kubectl -n poll exec deploy/poll -- python -c \
  "import sqlite3; print(sqlite3.connect('/data/poll.db').execute('select option, count(*) from votes group by option order by 2 desc').fetchall())"
```
