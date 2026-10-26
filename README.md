# Artroom & Production Operations Dashboard

A responsive operations dashboard built with **React, TypeScript, Tailwind CSS v4, and Firebase Firestore** to streamline physical manufacturing schedules, thread-to-Pantone matching, and team dispatch notes.

---

## 🚀 Key Features

* **Stage-Driven Production Tracking:** Track priority jobs across defined operational statuses (`danger`, `day3`, `day2`, `day1`, `returns`) with metadata validation and completion archiving.
* **Thread & Pantone Catalogue:** Fast search, filtering, and bidirectional sorting across proprietary thread codes, hex swatches, and Pantone matches.
* **Real-Time Team Notes:** Color-coded dispatch board synced instantly across workstations via Cloud Firestore.
* **Design Token Architecture:** Clean component layout powered by Tailwind v4 `@theme` design tokens and responsive mobile icon navigation.

---

## 🛠️ Tech Stack

* **Frontend:** React 18, TypeScript, Vite
* **Styling:** Tailwind CSS v4, Lucide React
* **Backend / Database:** Firebase Authentication, Cloud Firestore

---

## 💻 Development

```bash
npm install && npm run dev