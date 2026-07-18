require('dotenv').config();
const mongoose = require('mongoose');
const Design = require('./models/Design');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const designs = await Design.find();

  let updated = 0;

  for (const design of designs) {
    if (!design.imageUrl) continue;

    const match = design.imageUrl.match(
      /pmj-designs\/([^/.]+)\.(jpg|jpeg|png|webp)$/i
    );

    if (!match) continue;

    const filename =
      `pmj-designs_${match[1]}.${match[2]}`;

    design.imageUrl =
      `/uploads/${filename}`;

    await design.save();

    updated++;

    console.log(
      `${design.sku} -> ${filename}`
    );
  }

  console.log(
    `Updated ${updated} designs`
  );

  process.exit(0);
})();
