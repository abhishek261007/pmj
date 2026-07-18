const router =
  require('express').Router();

const Catalog =
  require('../models/Catalog');

const Design =
  require('../models/Design');


router.get(
  '/catalogs',
  async (_, res) => {
    try {
      const catalogs =
        await Catalog.find().sort({
          createdAt: -1
        });

      res.json(catalogs);

    } catch (err) {
      console.log(err);

      res.status(500).json({
        message:
          'Failed to fetch catalogs'
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET DESIGNS
|--------------------------------------------------------------------------
*/

router.get(
  '/designs',
  async (req, res) => {
    try {
      const { catalogId } =
        req.query;

      const filter = {};

      if (catalogId) {
        filter.catalogId =
          catalogId;
      }

      const designs =
        await Design.find(
          filter
        ).sort({
          createdAt: -1
        });

      res.json(designs);

    } catch (err) {
      console.log(err);

      res.status(500).json({
        message:
          'Failed to fetch designs'
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET SINGLE DESIGN
|--------------------------------------------------------------------------
*/

router.get(
  '/design/:id',
  async (req, res) => {
    try {
      const design =
        await Design.findById(
          req.params.id
        );

      if (!design) {
        return res
          .status(404)
          .json({
            message:
              'Design not found'
          });
      }

      res.json(design);

    } catch (err) {
      console.log(err);

      res.status(500).json({
        message:
          'Failed to fetch design'
      });
    }
  }
);

module.exports = router;