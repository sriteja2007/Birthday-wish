# 🎂 Interactive Birthday Wish ✨

An interactive, cinematic digital birthday gift website inspired by the viral Instagram animation reel. Features interactive Cupid's bow & arrow physics, cinematic letterbox reveals, a growing heart-shaped blossom tree blooming with hundreds of petals, background music from the reel, and instant name personalization with shareable links!

🌐 **Live Website URL**: [https://sriteja2007.github.io/Birthday-wish/](https://sriteja2007.github.io/Birthday-wish/)

---

## 🌟 Highlights & Features

- 🏹 **Interactive Bow & Arrow Physics**: Click & pull back the Cupid's bow to aim at the pulsing 3D heart. Release to launch the arrow with realistic spring physics.
- 💥 **Heart Pop & Particle Explosion**: On arrow impact, the heart bursts into an explosion of glowing hearts, sparkles, and shockwaves.
- 🎬 **Cinematic Reveal (Scene 2)**: Letterbox bars slide in, background turns to rich velvet magenta, revealing *"make a wish..."*, grand serif *"Happy Birthday [Name]"*, and an animated golden underline flourish.
- 🌸 **Blooming Heart Tree (Scene 3)**: An organic tree trunk rises and branches out into the contour of a heart, blooming into 320+ vibrant heart-shaped flower petals with drifting ambient petals and a frosted glass wish card (*"and... make it count / Happy Birthday [Name] / here's to a year that blooms"*).
- ✏️ **Personalization & Custom Name Edit**:
  - Edit recipient's name and custom subtitle directly via the floating **Edit Name** button.
  - Generates a **Personalized Share Link** with `?name=...` (e.g. `https://sriteja2007.github.io/Birthday-wish/?name=Sarah`) so when sent on WhatsApp or Instagram, it opens customized for that person!
  - Stores preferences in browser `localStorage`.
- 🎵 **Music & Audio**: Plays the soundtrack from the reel with mute/unmute control and Web Audio API synthesized backup.
- 📱 **100% Mobile & Desktop Responsive**: Looks stunning on iPhones, Android phones, tablets, and desktop displays.

---

## 🚀 Quick Personalization URL Examples

Share a customized link with anyone by appending their name to the URL:

- `https://sriteja2007.github.io/Birthday-wish/?name=Sarah`
- `https://sriteja2007.github.io/Birthday-wish/?name=Alex&wish=to+my+favorite+person`

---

## 🌐 How to Enable GitHub Pages (1-Minute Setup)

1. Open your repository on GitHub: [https://github.com/sriteja2007/Birthday-wish](https://github.com/sriteja2007/Birthday-wish)
2. Click **Settings** (top tab) -> Select **Pages** (left sidebar under "Code and automation").
3. Under **Build and deployment**:
   - **Source**: Select **Deploy from a branch**
   - **Branch**: Select `gh-pages` (or `main`) and `/ (root)`
   - Click **Save**
4. Your website will be live in ~60 seconds at:
   👉 **[https://sriteja2007.github.io/Birthday-wish/](https://sriteja2007.github.io/Birthday-wish/)**

---

## 🛠️ Tech Stack

- **HTML5** (Semantic structure & OpenGraph tags)
- **CSS3** (CSS Custom Properties, Flexbox, Keyframes, Glassmorphism, Letterbox bars)
- **JavaScript (ES6+)** (Pointer events, Canvas particle simulation, Procedural heart tree generation, Web Audio API)
- **GitHub Pages** (Continuous hosting)
