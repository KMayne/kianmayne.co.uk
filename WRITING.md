# Writing a post

The "Building in public" posts follow one framework, so each one reaches the same standard and stays
focused on its job: **giving the reader something of value.**

Starting a post:

1. Write the brief in `drafts/<slug>.md` (template below). Don't start the post until you can
   answer every question.
2. Copy `templates/post.html` to `public/blog/<slug>/index.html`.
3. Write it, replacing every `TODO` and yellow "✍ Your words" box.
4. Work through the checklist at the bottom, then link the post from the homepage.

## 1. The brief

Five questions, five minutes. If one has no answer, the post isn't ready.

```markdown
# <Project> brief

- **Type:** Tool / How-to / Build story
- **Reader:** who is this for? Describe them by the situation they're in.
- **They get:** what the reader leaves with: a tool to use, steps to copy, or a story and its lessons.
- **Hook:** their problem in one sentence, in their words.
- **Proof:** the one image or clip that shows it working.
- **Action:** the one thing they should do at the end.
```

## 2. Post types

"They get" decides the type, and the type decides the shape of the main section.

| Type | The reader gets | Main section | e.g. |
| --- | --- | --- | --- |
| **Tool** | Something to use today | A demo for each job they already have | Clipbox, sudo-passkey, run-or-raise |
| **How-to** | Something to copy into their own setup | Numbered steps, with commands to copy | chezmoi |
| **Build story** | A fun read and lessons they can apply | The journey in a few beats, and what you'd change | LED totem, K8s cluster |

## 3. The skeleton

Every post has the same order. Headings can change, but each section keeps its job.

| # | Section | Its job | Length |
| --- | --- | --- | --- |
| 1 | **Hook** | The reader's problem, not your project | 2–3 sentences |
| 2 | **TL;DR box** | What it is, what they get, and the action button | 3 lines |
| 3 | **Hero** | The proof from the brief | 1 image or clip |
| 4 | **The itch** | Why you built it: the human, fun bit | Short |
| 5 | **The main event** | The value, shaped by the post type | Most of the post |
| 6 | **Trust and caveats** | Why they can rely on it, and what it doesn't do | Optional, short |
| 7 | **Under the hood** | How it works, collapsed for the curious | Optional |
| 8 | **What's next** | Where it goes, and how readers can shape it, ending on the action | Short |
| 9 | **Poll** | What to write up next (the same in every post) | — |
| 10 | **Comments** | Questions, bugs, ideas (the same in every post) | — |

For **Tool** posts, put the action button in three places: the TL;DR, straight after the demos
(where the reader is most convinced) and at the end.

## 4. Before publishing

The value
- [ ] Reading only the headings tells the story.
- [ ] Every section passes "so what, for the reader?"
- [ ] The reader gets what the brief promised, and it's clear by the end of the TL;DR.
- [ ] The action is obvious, and comes at the points where they're most convinced.

The writing
- [ ] The hook is about them, not you.
- [ ] Jargon is cut, or explained in a few words.
- [ ] One strong visual per idea, not five weak ones. Every image has alt text.
- [ ] Cut anything you'd skim past as a reader.

The page
- [ ] No `TODO` or `.todo` left: `grep -n "TODO\|todo" public/blog/<slug>/index.html`
- [ ] Title, `og:title`, `description` and `og:image` are set, and the date is today.
- [ ] Every link works, and it reads well on a phone.
- [ ] The `noindex` meta tag is removed.
- [ ] The post is linked from the homepage.
- [ ] Its option is removed from the poll (`services/poll/polls.json`), and the poll redeployed.

## How the shared parts work

- `public/blog/blog.css` and `public/blog/blog.js` are shared by every post. Change them there,
  never in a post.
- `blog.js` fills in the reading time, runs the poll and loads the comments when the reader scrolls
  near them. The URLs of the poll and comments services are at the top of the file.
- The poll runs on the home cluster: `services/poll/`.
- Comments are Isso, on the home cluster too: `services/isso/`. New comments are hidden until
  you approve them.
