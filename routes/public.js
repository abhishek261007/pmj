const router =
  require('express').Router();

const Catalog =
  require('../models/Catalog');

const Design =
  require('../models/Design');

const Order =
  require('../models/Order');

/*
|--------------------------------------------------------------------------
| GET CATALOGS
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| CREATE ORDER
|--------------------------------------------------------------------------
*/

router.post(
  '/orders',
  async (req, res) => {
    try {
      const {
        customerName,
        customerPhone,
        items
      } = req.body;

      if (
        !customerName ||
        !customerPhone ||
        !items ||
        !Array.isArray(items)
      ) {
        return res
          .status(400)
          .json({
            message:
              'Missing required fields'
          });
      }

      const order =
        await Order.create({
          customerName,

          customerPhone,

          status: 'pending',

          items: items.map(
            (item) => ({
              designId:
                item._id,

              title:
                item.title,

              sku: item.sku,

              weight:
                item.weight,

              imageUrl:
                item.imageUrl,

              orderStatus:
                'pending'
            })
          )
        });

      res.json(order);

    } catch (err) {
      console.log(
        'CREATE ORDER ERROR',
        err
      );

      res.status(500).json({
        message:
          'Failed to place order'
      });
    }
  }
);

module.exports = router;