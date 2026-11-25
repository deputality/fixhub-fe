// Проверка контактов для заказа: общая для корзины и для кнопки «Заказать»
export function validateContact({ name, address, phone }) {
  const errors = {}
  if (!address.trim()) errors.address = 'Введите адрес'
  const digits = phone.replace(/\D/g, '')
  if (!phone.trim()) errors.phone = 'Введите телефон'
  else if (digits.length < 9 || digits.length > 12) errors.phone = 'Введите корректный номер, например +375 29 857 17 12'
  if (!name.trim()) errors.name = 'Введите имя'
  return errors
}
