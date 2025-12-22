import { useEffect, useState } from 'react';
import Card from '../../Components/Card'
import Carousel from '../../Components/Carousel'
import ServiceCard from '../../Components/Services Card';
import "./css/style.scss"
import { Link } from "react-router-dom"

export default function Home({ contacts = [], img = [], categories = [], products = [], services = [], tags = [] }) {
  const [isLoading, setIsLoading] = useState(true);

  const latestProducts = Array.isArray(products) ? [...products].slice(0, 6) : [];
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [contacts, img, categories, products, services]);

  useEffect(() => {
    if (categories.length > 0 || products.length > 0) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [categories, products]);


  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <Carousel contacts={contacts} images={img} />

      <div className="categories">
        <h2 className='title'>Categories</h2>
        <div className="categories-grid">
          {Array.isArray(categories) && categories.length > 0 ? categories.map((category) => (
            <Link
              to={`/products?category=${category.id}`}
              key={category.id}
              className="category"
            >
              <h3>{category.name}</h3>
            </Link>
          )) : <div className='empty'><h2>There isn't any Categories</h2></div>}
        </div>
      </div>

      <div className="randomProducts cards-container">
        <h2 className="title">Some of Our Products</h2>
        {Array.isArray(products) && products.length > 0 ? (
          [...products]
            .filter(product => product.is_active === true)
            .sort(() => 0.5 - Math.random())
            .slice(0, 6)
            .map(product => (
              <Card key={product.id} card={product} categories={categories} tags={tags} />
            ))
        ) : (
          <div className='empty'><h2>There isn't any Products</h2></div>
        )}
      </div>

      <div className="latestProducts cards-container">
        <h2 className="title">Our Latest Products</h2>
        {latestProducts.length != 0 ? latestProducts.filter(product => product.is_active == true).map(
          product => (
            <Card key={product.id} card={product} categories={categories} tags={tags} />
          ))
          :
          (<div className='empty'><h2>There isn't any Products</h2></div>)}
      </div>

      {/* <div className="services cards-container">
        <h2 className="title">our Services</h2>
        {services.length != 0 ? services.map(service => (
          <ServiceCard key={service.id} card={service} />
        )) : <div className='empty'><h2>There isn't any Services</h2></div>}
      </div> */}
    </div>
  )
}

