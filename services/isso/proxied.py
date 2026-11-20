"""Isso, behind the Tailscale Funnel proxy.

Funnel sets X-Forwarded-For to the visitor's address (replacing anything the visitor sent),
so trust exactly one hop of it. Isso then sees each reader's own address, which its rate
limits and vote counting rely on (it stores it anonymised, e.g. 203.0.113.0).
"""

from werkzeug.middleware.proxy_fix import ProxyFix

from isso.run import application as isso

application = ProxyFix(isso, x_for=1)
