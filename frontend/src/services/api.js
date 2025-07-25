const BASE_URL =" http://127.0.0.1:8000"

export const getProducts =  async ()=>{
    try{
        const response = await fetch(`${BASE_URL}/api/products/`)
        const data = await response.json()
        return data
    }
    catch(err){
        return err
    }
}
export const getContacts =  async ()=>{
    try{
        const response = await fetch(`${BASE_URL}/api/contact/`)
        const data = await response.json()
        return data
    }
    catch(err){
        return err
    }
}
export const getServices =  async ()=>{
    try{
        const response = await fetch(`${BASE_URL}/api/services/`)
        const data = await response.json()
        return data
    }
    catch(err){
        return err
    }
}
export const getCategories =  async ()=>{
    try{
        const response = await fetch(`${BASE_URL}/api/categories/`)
        const data = await response.json()
        return data
    }
    catch(err){
        return err
    }
}
export const getCarousel =  async ()=>{
    try{
        const response = await fetch(`${BASE_URL}/api/carousels/`)
        const data = await response.json()
        return data
    }
    catch(err){
        return err
    }
}
