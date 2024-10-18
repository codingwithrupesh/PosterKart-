"use strict";

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async customOrderController(ctx) {
    try {
      const entries = await strapi.entityService.findMany(
        "api::product.product",
        {
          fields: ["Title", "Description"],
          limit: 2,
        }
      );

      const { products } = ctx.request.body;

      return { product: entries };
    } catch (error) {}
  },

  async create(ctx) {
    try {
      // console.log("ctx", ctx);
      
      const {products} = ctx.request.body;
      // console.log("product from car t to  server", {products});
      const lineItems = await Promise.all(products.map(async (product) => {

        const productEntities = await strapi.entityService.findMany("api::product.product", {
          filters: {
            Key: product.Key
          }
        })
			const realProduct = productEntities[0];
			  const image = product.Image
			  return {
				  price_data: {
					currency: 'inr',
					product_data: {
						name: realProduct.Title,
						images: [image]
					},
					unit_amount: realProduct.Price * 100
				  },
				  quantity: product.quantity
			  }
		  }));		
   
  console.log("line Items",lineItems);

      const session = await stripe.checkout.sessions.create({
        shipping_address_collection: {
          allowed_countries: ['IN']
        },
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.CLIENT_BASE_URL}/payments/success`,
        cancel_url: `${process.env.CLIENT_BASE_URL}/payments/failed`,
        });
  
  

      console.log("sessions", {session});
      await strapi.entityService.create("api::order.order", {
        data: {
          products,
          stripeId: session.id,
        },
      });
      return { stripeId:session.id};
    } catch (error) {
      console.log(error);
      ctx.response.status = 400;
      return error;
    }
  },
}));
