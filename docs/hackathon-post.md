I'll be building OpenSpace tomorrow. Bring in the drawings of a unit, get a space you can shape, stand inside and furnish.

Why is this interesting?
The lease is signed and all you have is a landlord PDF. It's accurate and completely inert — it tells you where the walls and the columns are, and nothing about what you're going to put in there. So the planning phase happens across a printed plan with pencil marks, a Pinterest board, a WhatsApp thread and a spreadsheet, and none of them know about each other. Move a section and the budget doesn't know. Find a chair you love and the plan doesn't know.

OpenSpace makes them the same thing. The box you place on the plan is the pin in your album is the line in the cost estimate. Which means specificity can arrive late: today you drop a plain 1600×800 box called "sofa", because right now you only need to know whether a sofa fits. Later you attach the real one and the box inherits its picture, its price and its actual dimensions — which may well argue with the layout you drew.

The other half is feel. A top-down plan structurally cannot tell you how tight the aisle between banquettes is, or what you see from the entrance. So the same space is navigable at eye level. How many fit and how it feels are equally load-bearing, and most tools only answer the first.

Could be useful for mission too
This is the conversation that happens immediately before every fit-out we touch, and it currently happens in fragments. Being able to hand a partner a scheme instead of a question is worth something.

Tech Stack

Vision model for drawing → true-to-scale vectorised plan (the interesting risk: it has to be correctable, not a black box)
2D canvas + three.js/R3F for the 3D walkthrough off one shared geometry model
Scraping product pages for price and real dimensions
Next.js on Vercel, Supabase

Scope for the day is the spine: drawings in, 2D and 3D out, and a handful of items proving the plan/album/cost link. Everything else is vision doc.
