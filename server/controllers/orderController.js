import prisma from '../config/database.js';

// Get all orders
export const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, factory } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      userId: req.user.id,
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { factoryName: { contains: search, mode: 'insensitive' } },
          { yarnComposition: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(status && { status }),
      ...(factory && { factoryName: { contains: factory, mode: 'insensitive' } })
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get single order
export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        userId: req.user.id
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create order
export const createOrder = async (req, res) => {
  try {
    const {
      orderNumber,
      factoryName,
      yarnComposition,
      price,
      quantity,
      orderDate,
      deliveryDate,
      notes
    } = req.body;

    // Validation
    if (!orderNumber || !factoryName || !yarnComposition || !price || !quantity || !orderDate) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: orderNumber, factoryName, yarnComposition, price, quantity, orderDate'
      });
    }

    // Check if order number already exists
    const existingOrder = await prisma.order.findUnique({
      where: { orderNumber }
    });

    if (existingOrder) {
      return res.status(400).json({
        success: false,
        message: 'Order number already exists'
      });
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        factoryName,
        yarnComposition,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        orderDate: new Date(orderDate),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        notes,
        userId: req.user.id
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update order
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      orderNumber,
      factoryName,
      yarnComposition,
      price,
      quantity,
      orderDate,
      deliveryDate,
      status,
      notes
    } = req.body;

    // Check if order exists and belongs to user
    const existingOrder = await prisma.order.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order number is being changed and already exists
    if (orderNumber && orderNumber !== existingOrder.orderNumber) {
      const duplicateOrder = await prisma.order.findUnique({
        where: { orderNumber }
      });

      if (duplicateOrder) {
        return res.status(400).json({
          success: false,
          message: 'Order number already exists'
        });
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(orderNumber && { orderNumber }),
        ...(factoryName && { factoryName }),
        ...(yarnComposition && { yarnComposition }),
        ...(price && { price: parseFloat(price) }),
        ...(quantity && { quantity: parseInt(quantity) }),
        ...(orderDate && { orderDate: new Date(orderDate) }),
        ...(deliveryDate !== undefined && { 
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null 
        }),
        ...(status && { status }),
        ...(notes !== undefined && { notes })
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete order
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if order exists and belongs to user
    const existingOrder = await prisma.order.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await prisma.order.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};