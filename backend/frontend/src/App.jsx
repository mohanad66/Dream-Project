// src/App.js
import { Routes, Route } from 'react-router';
import Home from './Pages/Home/index.jsx';
import Products from './Pages/Products/index.jsx';
import About from './Pages/About us/index.jsx';
import { getCarousel , getProducts , getCategories , getServices , getContacts } from "./services/api.js";
import { useEffect, useState } from 'react';
import Navbar from './Components/Navbar/index.jsx';
import "./css/style.scss"
import FavoritesPage from "./Pages/Favourite/index.jsx"

export default function App() {
  const [imgs, setImgs] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const[contacts , setContacts] = useState([])
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchImgs = async () => {
      try {
        setIsLoading(true);
        const response = await getCarousel();
        setImgs(response.data || response); // Handle different API response structures
      } catch (err) {
        setError(err.message || "Failed to fetch carousel images");
        console.error("Error fetching carousel:", err);
      } finally {
        setIsLoading(false);
      }
    };
     const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const response = await getProducts();
        setProducts(response.data || response); // Handle different API response structures
      } catch (err) {
        setError(err.message || "Failed to fetch carousel images");
        console.error("Error fetching carousel:", err);
      } finally {
        setIsLoading(false);
      }
    };
     const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const response = await getCategories();
        setCategories(response.data || response); // Handle different API response structures
      } catch (err) {
        setError(err.message || "Failed to fetch carousel images");
        console.error("Error fetching carousel:", err);
      } finally {
        setIsLoading(false);
      }
    };
     const fetchServices = async () => {
      try {
        setIsLoading(true);
        const response = await getServices();
        setServices(response.data || response); // Handle different API response structures
      } catch (err) {
        setError(err.message || "Failed to fetch carousel images");
        console.error("Error fetching carousel:", err);
      } finally {
        setIsLoading(false);
      }
    };
     const fetchContacts = async () => {
      try {
        setIsLoading(true);
        const response = await getContacts();
        setContacts(response.data || response); // Handle different API response structures
      } catch (err) {
        setError(err.message || "Failed to fetch carousel images");
        console.error("Error fetching carousel:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContacts()
    fetchImgs();
    fetchCategories();
    fetchProducts();
    fetchServices();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>; // Add a proper loading component
  }

  if (error) {
    return <div>Error: {error}</div>; // Add a proper error component
  }

  return (
    <>
    <Routes>
      <Route path="/" element={<Home contacts={contacts} img={imgs} services={services} categoties={categories} products={products} />} />
      <Route path="/products" element={<Products products={products} categories={categories} />} />
      <Route path='favourite/' element={<FavoritesPage categories={categories} />} />
      <Route path="/about" element={<About />} />
    </Routes>
    <Navbar />
    </>
  );
}