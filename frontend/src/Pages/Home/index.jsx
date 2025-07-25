import Card from '../../Components/Card'
import Carousel from '../../Components/Carousel'
import ServiceCard from '../../Components/Services Card';
import ServicesCard from '../../Components/Services Card';
import "./css/style.css"
import {Link} from "react-router-dom"
export default function Home({contacts , img, categoties, products, services }) {
  const latestProducts = [...products]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);
  return (
    <div className="home">
      <Carousel contacts={contacts} images={img} />
      <div className="categories">
        <h2 className='title'>Categories</h2>
        <div className="categories-grid">
          {categoties.map((category) => (
            <Link
              to={`/products?category=${category.id}`} // or your preferred route structure
              key={category.id}
              className="category"
            >
              <h3>{category.name}</h3>
            </Link>
          ))}
        </div>
      </div>
      <div className="bestProducts cards-container">
        <h2 className='title'>Best Products</h2>
        {products.filter(product => product.best_products && product.is_active).map((product) => (
          <Card card={product} categories={categoties} />
        )).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 8)}
      </div>
      <div className="latestProducts cards-container">
        <h2 className="title">Our Latest Products</h2>
        {latestProducts.filter(product => product.is_active).map(product => (
          <Card card={product} categories={categoties} />
        ))}
      </div>
      <div className="services cards-container">
        <h2 className="title">our Services</h2>
        {services.map(service => (
          <ServiceCard card={service} />
        ))}
      </div>
    </div>
  )
}
