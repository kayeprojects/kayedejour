# kayedejour'

A personal project designed for daily journaling and private use.

Live Demo: [https://kayedejour.onrender.com](https://kayedejour.onrender.com)

## About

This application was built as a personal project to store daily journals and for private usage. It provides a simple, secure way to document daily life and thoughts.

## Features

- **Daily Journaling**: Dedicated interface for tracking daily activities.
- **Rich Text Editor**: Full formatting support for expressive entries with TipTap.
- **Image Support**: Upload and optimize images for your journals (thumbnail, medium, large versions).
- **Folder Organization**: Create custom folders/collections to organize notes.
- **Text Size Control**: Switch between Small, Medium, and Large text sizes in the editor.
- **Category Picker**: Move notes between folders directly from the editor.
- **Guest Mode**: Use the app without logging in - data is stored locally.
- **Cloud Sync**: Login with Google to sync notes across devices via Supabase.
- **Dark Mode**: Beautiful dark theme enabled by default.
- **Responsive Design**: Seamless experience across desktop and mobile.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: TailwindCSS v4
- **Backend**: Supabase (Auth, Database, Storage)
- **Local Storage**: Dexie.js (IndexedDB)
- **Editor**: TipTap
- **Typography**: Plus Jakarta Sans (Headings), Inter (Body)

## Recent Changes

- Added text size toggle (Small/Medium/Large) in the editor toolbar
- Added category/folder picker in the editor to move notes between folders
- Implemented guest mode - no login required to start using the app
- Updated default theme to dark mode
- Updated typography to Plus Jakarta Sans and Inter fonts
- Updated favicon to custom logo
