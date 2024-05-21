import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import { Product } from "../models/product.js";
import fs  from "fs"


const registerProduct = async (req, res) => {
  try {
    let { name, price, description, contactDetails, Address, collageName, city, category } = req.body;
    const avatars = req.files["avatar"];

    name = name.toLowerCase();
    description = description.toLowerCase();
    Address = Address.toLowerCase();
    collageName = collageName.toLowerCase();
    city = city.toLowerCase();
    category = category.toLowerCase();

    if (!name || !price || !description || !contactDetails || !Address || !collageName || !city || !category || !avatars) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!Array.isArray(avatars) || avatars.length === 0) {
      return res.status(400).json({ error: "No avatar files provided" });
    }

    const avatarUrls = await Promise.all(avatars.map(async (avatar) => {
      try {
        const url = await uploadOnCloudinary(avatar.path);
        
        fs.unlinkSync(avatar.path);
        return url;
      } catch (uploadError) {
        console.error("Error uploading avatar:", uploadError);
        return null;
      }
    }));

    // Check if any avatar upload failed
    if (avatarUrls.some(url => !url)) {
      return res.status(500).json({ error: "Error uploading avatar images" });
    }

    const userId = req.user;

    const existingProduct = await Product.findOne({ collageName, city });

    if (existingProduct) {
      existingProduct.sellers.push({
        name,
        price,
        description,
        avatar: avatarUrls,
        category,
        contactDetails,
        Address,
        user: userId, 
      });
      await existingProduct.save();
      res.status(200).json({ message: "Product added to existing seller" });
    } else {
      const product = new Product({
        collageName,
        city,
        sellers: [
          {
            name,
            price,
            description,
            avatar: avatarUrls,
            category,
            contactDetails,
            Address,
            user: userId, 
          },
        ],
      });
      await product.save();
      res.status(200).json({ message: "New product registered" });
    }
  } catch (error) {
    console.error("Error registering Product:", error);
    res.status(500).json({ error: "Something went wrong while registering the product" });
  }
};


const getProductsByUserIdAndProductId = async (req, res) => {
  try {
    const { userId, productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found with the given ID" });
    }

    const foundSeller = product.sellers.find(s => s._id.toString() === userId);

    if (!foundSeller) {
      return res.status(404).json({ error: "Seller not found with the given ID in this product" });
    }

    res.status(200).json({ seller: foundSeller });
  } catch (error) {
    console.error("Error fetching seller:", error);
    res.status(500).json({ error: "Something went wrong while fetching the seller" });
  }
};


const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 })
    if (products.length === 0) {
      return res.status(404).json({ error: "No products found" });
    }
    res.status(200).json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Something went wrong while fetching products" });
  }
};



const updateProductById = async (req, res) => {
  const { id } = req.params;
  const { name, price, description, contactDetails, Address, category } =
    req.body;
  const avatarUrls = [];
  const avatars = req.files["avatar"];
  for (const avatar of avatars) {
    const url = await uploadOnCloudinary(avatar.path);
    if (url) {
      avatarUrls.push(url);
    }
  }

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.name = name;
    product.price = price;
    product.description = description;
    product.contactDetails = contactDetails;
    product.Address = Address;
    product.category = category;
    product.avatar = avatarUrls;

    await product.save();

    res
      .status(200)
      .json({
        message: "Product updated successfully",
        updatedProduct: product,
      });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.avatar.forEach(async (imageUrl) => {
      const publicId = imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    });

    await Product.findByIdAndDelete(id);

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { registerProduct, updateProductById, deleteProduct, getProductsByUserIdAndProductId, getProducts};
