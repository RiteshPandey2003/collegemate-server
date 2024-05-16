import { Router } from "express";
import { getProducts, getProductsByUserId, registerProduct, updateProductById } from "../controllers/product.js";
import { upload } from "../middlewares/multer.js";


const router = Router();

router.post('/register', upload.fields([{ name: 'avatar', maxCount: 3 }]), registerProduct);
router.get('/sellerproduct/:userId', getProductsByUserId);
router.put('/update/:id', updateProductById); 
router.get('/', getProducts)
export default router;
