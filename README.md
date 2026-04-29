# CapyClass

CapyClass is a classroom coding platform built for teachers and students. It gives educators a shared space where they can create classes, assign programming tasks, review student submissions, and run code directly in the browser.

## Why this project exists

Many beginner programming classes use separate tools for assignments, file sharing, code editing, and online compilers. That makes it harder for students to focus and harder for teachers to review progress. CapyClass brings these workflows together in one application:

- Students can write, save, and submit code in their classroom workspace.
- Teachers can open each student's files, run their code, and mark work as correct or incorrect.
- Code can be executed from the app, including interactive programs that ask for terminal input.
- Terminal output is formatted to look closer to a real online compiler, so prompts and typed values appear in a readable order.

## Main features

- **Classroom management**: create classrooms, invite students, and manage enrollments.
- **Student workspaces**: each student can create files, choose a language, write code, and save progress.
- **Task assignments**: teachers can create tasks with descriptions and optional deadlines.
- **Teacher review tools**: teachers can inspect student files, run submissions, leave notes, and mark solutions as correct or incorrect.
- **Built-in code execution**: supports server-side execution for languages available on the host, including JavaScript, TypeScript, Python, C, C++, Java, Ruby, and Swift.
- **Interactive terminal input**: programs using `input`, `readline`, `Scanner`, `scanf`, `cin`, and similar stdin APIs can request values step by step.
- **Cleaner compiler-style output**: input values are echoed beside prompts while result lines such as `Result:` / `Nəticə:` are protected from accidental extra inserted values.
- **Authentication and rate limiting**: execution and classroom actions are protected for logged-in users.

## When to use CapyClass

CapyClass is useful for:

- programming teachers who need to track student submissions in one place;
- students practicing beginner-to-intermediate coding exercises;
- classrooms where terminal-based input/output examples are important;
- small coding courses, workshops, or school projects that need a lightweight LMS-style coding environment.

## Tech stack

- [Next.js](https://nextjs.org/) App Router
- TypeScript
- React
- Prisma
- NextAuth
- Tailwind CSS
- Monaco Editor

## Getting started

Install dependencies:

```bash
npm install
```

Create an environment file from the example and fill in the required values:

```bash
cp .env.example .env
```

Run the development server:

```bash
npm run dev
```

Open the local URL shown in the terminal, usually [http://localhost:3000](http://localhost:3000).

## Useful scripts

```bash
npm run dev      # start the development server
npm run lint     # run ESLint checks
npm run build    # create a production build
npm run start    # start the production server
```

## Notes about code execution

The execution API runs code on the server in temporary sandbox folders and removes those folders after execution. Available languages depend on what compilers/interpreters are installed on the deployment machine. For example, JavaScript requires Node.js, Python requires Python 3, C/C++ require GCC/G++, and Java requires a JDK.

For safety and stability, code size, input size, output size, execution time, and request rate are limited.
