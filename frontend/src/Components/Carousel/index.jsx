import { useState, useEffect } from 'react';
import { BsArrowLeftCircleFill, BsArrowRightCircleFill } from 'react-icons/bs';
import './css/style.scss';
import useFancybox from '../Fancy Box';
import { FiMail ,  FiPhone , FiInfo , } from "react-icons/fi";
import { FaFacebook, FaWhatsapp ,FaGithub , FaLinkedin ,FaInstagram ,FaTwitter} from "react-icons/fa";

const Carousel = ({ images = [], contacts }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [fancyboxRef] = useFancybox({
    // Your custom options
  });

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAnimating) {
        handleNext();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [currentImage, isAnimating]);

  const handlePrevious = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setTimeout(() => setIsAnimating(false), 500);
  };

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsAnimating(false), 500);
  };

  if (!images || images.length === 0) {
    return (
      <div className="carousel">
        <div className="main-carousel no-images">
          <p>No images available</p>
        </div>

        <div className="contact-panel">
          <div className="panel-content">
            <h3>Contact us</h3>
            <p>If you want to order special products or repair your device</p>
            <a href="#contact" className="cta-button">Contact us</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="carousel">
      {/* Main Carousel Area - Left Side */}
      <div className="main-carousel">
        <BsArrowLeftCircleFill
          onClick={handlePrevious}
          className='arrow arrowLeft'
          aria-label="Previous image"
          size={32}
        />

        <div ref={fancyboxRef} className="slider-container">
          {images.map((imageItem, index) => (
            <div
              key={imageItem.id || `image-${index}`}
              className={`slide ${currentImage === index ? 'active' : ''} ${index < currentImage ? 'left' : 'right'}`}
            >
              <div className="image-container">
                <a data-fancybox={`gallery${index}`} href={`http://127.0.0.1:8000${imageItem.image}`}>
                  <img
                    src={`http://127.0.0.1:8000${imageItem.image}`}
                    alt={imageItem.altText || `Showcase ${index + 1}`}
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/path/to/fallback-image.jpg';
                    }}
                  />
                </a>
              </div>
              {imageItem.name && <h4 className='title1'>{imageItem.name}</h4>}
            </div>
          ))}
        </div>

        <BsArrowRightCircleFill
          onClick={handleNext}
          className='arrow arrowRight'
          aria-label="Next image"
          size={32}
        />

        <div className='circle-indicator'>
          {images.map((_, index) => (
            <button
              key={`indicator-${index}`}
              className={`indicator-dot ${currentImage === index ? 'active' : ''}`}
              onClick={() => {
                if (!isAnimating) {
                  setCurrentImage(index);
                  setIsAnimating(true);
                  setTimeout(() => setIsAnimating(false), 500);
                }
              }}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="contact-panel">
        <div className="panel-content">
          <h3>Contact Us</h3>
          <p>Get in touch for special orders or device repairs</p>

          <div className="contact-columns">
            {/* Left Column */}
              {/* Static phone number */}


              {/* Dynamic contact methods - first half */}
              {contacts.slice(0, Math.ceil(contacts.length / 2)).map(contact => (
                <ContactItem key={contact.id} contact={contact} />
              ))}
              {contacts.slice(Math.ceil(contacts.length / 2)).map(contact => (
                <ContactItem key={contact.id} contact={contact} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
function ContactItem({ contact }) {
  const getIconComponent = () => {
    switch (contact.contact_type) {
      case 'email':
        return <FiMail className="contact-icon" />;
      case 'phone':
        return <FiPhone className="contact-icon" />;
      case 'social':
        if (contact.value.includes('facebook')) return <FaFacebook className="contact-icon" />;
        if (contact.value.includes('twitter')) return <FaTwitter className="contact-icon" />;
        if (contact.value.includes('instagram')) return <FaInstagram className="contact-icon" />;
        if (contact.value.includes('linkedin')) return <FaLinkedin className="contact-icon" />;
        if (contact.value.includes('github')) return <FaGithub className="contact-icon" />;
        if (contact.value.includes('whatsapp')) return <FaWhatsapp className="contact-icon" />;
        return <FiLink className="contact-icon" />;
      default:
        return contact.icon ? (
          <img
            src={`http://127.0.0.1:8000${contact.icon}`}
            alt={contact.name}
            className="contact-icon-img"
          />
        ) : <FiInfo className="contact-icon" />;
    }
  };

  return (
    <div className={`contact-method ${contact.contact_type}`}>
      <div className="contact-icon-container">
        {getIconComponent()}
      </div>
      <div className="contact-details">
        <span className="contact-name">{contact.name}</span><br/>
        {contact.contact_type === 'email' ? (
          <a href={`mailto:${contact.value}`} className="contact-value">
            {contact.value}
          </a>
        ) : contact.contact_type === 'phone' ? (
          <a href={`tel:${contact.value}`} className="contact-value">
            {formatPhoneNumber(contact.value)}
          </a>
        ) : contact.contact_type === 'social' ? (
          <a
            href={contact.value}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-value"
          >
            {getSocialDisplayName(contact.value)}
          </a>
        ) : (
          <span className="contact-value">{contact.value}</span>
        )}
      </div>
    </div>
  );
}

// Helper functions
function formatPhoneNumber(phoneNumber) {
  // Format phone numbers for better readability
  return phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
}

function getSocialDisplayName(url) {
  // Extract cleaner display names from social URLs
  const cleanUrl = url.replace(/^https?:\/\/(www\.)?/, '');
  return cleanUrl.split('/')[0];
}
export default Carousel;