# ClassSplitter

Split a class into random groups in seconds. Made for teachers: save your class lists, mark who is absent today, keep certain students apart and show the groups on the projector. Plain HTML, CSS and JavaScript, no login, nothing to install.

## Features

- **Fast name entry:** type a name and press Enter, or paste a whole list at once (one per line, or separated by commas). Duplicates are caught.
- **Saved classes:** keep several class lists (for example "10.a" and "11.b"). Everything is saved in your browser and is still there next time.
- **Absent today:** click a name to mark the student absent. They are left out of groups until you click again.
- **Split by group size or by number of groups.** Groups are as even as possible: 7 students in groups of 3 gives 3, 2 and 2, not 3, 3 and 1.
- **Keep apart:** choose pairs of students who should never be in the same group.
- **Mix it up:** avoids putting students together who were in the same group last time.
- **Roles:** optionally give everyone a role (Leader, Writer, Timekeeper, Presenter, Researcher, Checker).
- **Color-coded groups:** Blue group, Red group, Green group… easy to call out in class.
- **Copy as text** to paste the groups into a chat or document.
- **Present:** a big, full-screen view of the groups for the projector.
- **Pick a student:** picks someone at random, but nobody is picked twice until everyone has had a turn.
- Works on phones, tablets and computers.

## Run it

Open `index.html` in a browser.



## How the groups are made

The students are shuffled (Fisher–Yates) and split into groups of the chosen size. This is repeated up to 500 times, and the result that breaks the fewest rules wins: a "keep apart" pair in the same group counts much more than two students meeting again from last time. If a rule can't be kept (for example, too few groups), the page says so.

## Project structure

```
index.html      Page layout
css/style.css   All styles
js/app.js       Class lists, groups, keep-apart rules, picker and saving
fire.png        Browser tab icon
```

Student names are only stored in the browser on this device (localStorage). Nothing is sent anywhere.
